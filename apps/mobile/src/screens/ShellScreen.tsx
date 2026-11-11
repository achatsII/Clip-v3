import * as SplashScreen from 'expo-splash-screen'
import * as WebBrowser from 'expo-web-browser'
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentRef } from 'react'
import { AppState, BackHandler, Linking, Platform, StyleSheet, useColorScheme } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { WebView, type WebViewMessageEvent } from 'react-native-webview'
import type { ShouldStartLoadRequest } from 'react-native-webview/lib/WebViewTypes'

import { createHandlers } from '../bridge/handlers'
import { capabilitiesUpdateScript, deliveryScript, environmentScript } from '../bridge/injection'
import {
  BRIDGE_VERSION,
  type BridgeEvent,
  type BridgeEventMessage,
  type BridgeResponseMessage,
  type Capability,
  type NativeEnvironment,
} from '../bridge/protocol'
import { routeBridgeMessage } from '../bridge/router'
import { isSameOrigin, type WebTarget } from '../config/env'
import { shouldLoadInApp } from '../config/navigation'
import { logError, logEvent } from '../logging/log'
import { colors } from '../ui/theme'
import { OfflineScreen } from './SystemScreens'
import { strings } from '../i18n'

export function ShellScreen({
  target,
  environment,
  capabilities,
}: {
  target: WebTarget
  environment: Omit<NativeEnvironment, 'capabilities'>
  capabilities: Capability[]
}) {
  const dark = useColorScheme() === 'dark'
  const webRef = useRef<ComponentRef<typeof WebView>>(null)
  const canGoBack = useRef(false)
  const capabilitiesRef = useRef(capabilities)
  capabilitiesRef.current = capabilities
  const [failure, setFailure] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  const deliver = useCallback((message: BridgeResponseMessage | BridgeEventMessage) => {
    webRef.current?.injectJavaScript(deliveryScript(message))
  }, [])

  const emit = useCallback((event: BridgeEvent) => deliver({ v: BRIDGE_VERSION, event }), [deliver])
  const handlers = useMemo(() => createHandlers(emit), [emit])

  // Le script injecté avant chaque chargement porte les capacités du moment.
  const injected = useMemo(
    () => environmentScript({ ...environment, capabilities }),
    [environment, capabilities],
  )

  // Capacités changées (configuration relue) : la page ouverte est mise à jour sans recharger.
  const capabilitiesKey = capabilities.join(',')
  const firstCapabilities = useRef(true)
  useEffect(() => {
    if (firstCapabilities.current) {
      firstCapabilities.current = false
      return
    }
    webRef.current?.injectJavaScript(capabilitiesUpdateScript(capabilitiesRef.current))
  }, [capabilitiesKey])

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') emit({ type: 'app.foreground' })
    })
    return () => sub.remove()
  }, [emit])

  useEffect(() => {
    if (Platform.OS !== 'android') return
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!canGoBack.current) return false
      webRef.current?.goBack()
      return true
    })
    return () => sub.remove()
  }, [])

  const onMessage = useCallback(
    async (event: WebViewMessageEvent) => {
      const { url, data } = event.nativeEvent
      if (!isSameOrigin(url, target.origin)) {
        logEvent('bridge.rejected_origin', { url })
        return
      }
      const response = await routeBridgeMessage(data, {
        handlers,
        capabilities: () => capabilitiesRef.current,
        onError: (error, ctx) => logError(error, { action: `bridge.${ctx.type ?? 'unknown'}` }),
      })
      if (response) deliver(response)
    },
    [handlers, deliver, target.origin],
  )

  const onShouldStartLoadWithRequest = useCallback(
    (req: ShouldStartLoadRequest) => {
      if (shouldLoadInApp(req, target.origin)) return true
      if (/^https?:/i.test(req.url)) void WebBrowser.openBrowserAsync(req.url).catch(() => undefined)
      else void Linking.openURL(req.url).catch(() => undefined)
      return false
    },
    [target.origin],
  )

  const hideSplash = useCallback(() => {
    void SplashScreen.hideAsync().catch(() => undefined)
  }, [])

  if (failure) {
    return (
      <OfflineScreen
        detail={failure}
        onRetry={() => {
          setFailure(null)
          setReloadKey((k) => k + 1)
        }}
      />
    )
  }

  return (
    <SafeAreaView
      // iOS : la page gère le bas (env(safe-area-inset-bottom)) ; Android : marges posées ici,
      // la prise en charge des insets par la WebView variant selon les versions.
      edges={Platform.OS === 'android' ? ['top', 'bottom'] : ['top']}
      style={[styles.page, { backgroundColor: dark ? colors.pageDark : colors.pageLight }]}
    >
      <WebView
        key={reloadKey}
        ref={webRef}
        source={{ uri: target.url }}
        originWhitelist={['https://*', 'http://*', 'about:*', 'blob:*', 'data:*']}
        injectedJavaScriptBeforeContentLoaded={injected}
        onMessage={onMessage}
        onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
        onNavigationStateChange={(nav) => {
          canGoBack.current = nav.canGoBack
        }}
        onLoadEnd={hideSplash}
        onError={(e) => {
          logError(new Error(e.nativeEvent.description), { screen: 'shell', action: 'load', code: e.nativeEvent.code })
          hideSplash()
          setFailure(e.nativeEvent.description)
        }}
        onHttpError={(e) => {
          const { statusCode, url } = e.nativeEvent
          if (statusCode >= 500 && isSameOrigin(url, target.origin)) {
            logError(new Error(`HTTP ${statusCode}`), { screen: 'shell', action: 'load', url })
            hideSplash()
            setFailure(strings().system.serviceStatus(statusCode))
          }
        }}
        onContentProcessDidTerminate={() => webRef.current?.reload()}
        onRenderProcessGone={() => setReloadKey((k) => k + 1)}
        javaScriptEnabled
        domStorageEnabled
        sharedCookiesEnabled
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        mediaCapturePermissionGrantType="grantIfSameHostElsePrompt"
        allowsBackForwardNavigationGestures
        setSupportMultipleWindows={false}
        pullToRefreshEnabled={false}
        // Pas de zoom des écrans par pincement (Android ; iOS suit la balise viewport de l'app web).
        setBuiltInZoomControls={false}
        setDisplayZoomControls={false}
        bounces={false}
        keyboardDisplayRequiresUserAction={false}
        contentInsetAdjustmentBehavior="never"
        applicationNameForUserAgent={`CLIPShell/${environment.appVersion}`}
        webviewDebuggingEnabled={__DEV__}
        style={styles.web}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  web: { flex: 1, backgroundColor: 'transparent' },
})
