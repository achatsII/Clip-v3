import * as Application from 'expo-application'
import Constants, { ExecutionEnvironment } from 'expo-constants'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import * as SystemUI from 'expo-system-ui'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { AppState, Platform, useColorScheme } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { BRIDGE_VERSION, type NativeEnvironment, type NativePlatform, type PublicConfig } from './src/bridge/protocol'
import { CaptureHost } from './src/capture/CaptureHost'
import { capabilitiesFor } from './src/config/capabilities'
import { getWebTarget } from './src/config/env'
import { evaluateForceUpdate } from './src/config/forceUpdate'
import { fetchPublicConfig } from './src/config/remoteConfig'
import { configureLogging, logError, logEvent } from './src/logging/log'
import { cleanupMedia } from './src/media/mediaStore'
import { ForceUpdateScreen, SetupScreen } from './src/screens/SystemScreens'
import { ShellScreen } from './src/screens/ShellScreen'
import { localStore } from './src/storage/localStore'
import { colors } from './src/ui/theme'

void SplashScreen.preventAutoHideAsync().catch(() => undefined)

/** Au démarrage, on attend la configuration au plus ce délai avant d'afficher la page. */
const BOOT_CONFIG_WAIT_MS = 2_500
/** Au retour au premier plan, au plus une relecture de la configuration par intervalle. */
const REFRESH_MIN_INTERVAL_MS = 30_000

const platform: NativePlatform = Platform.OS === 'ios' ? 'ios' : 'android'

/** Dans Expo Go, la version native est celle d'Expo Go : on lit alors celle d'app.json. */
function shellVersion(): string {
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
    return Constants.expoConfig?.version ?? '0.0.0'
  }
  return Application.nativeApplicationVersion ?? Constants.expoConfig?.version ?? '0.0.0'
}

const appVersion = shellVersion()
const target = getWebTarget()

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(fallback), ms)
    promise.then(
      (v) => {
        clearTimeout(timer)
        resolve(v)
      },
      () => {
        clearTimeout(timer)
        resolve(fallback)
      },
    )
  })
}

export default function App() {
  const dark = useColorScheme() === 'dark'
  const [booted, setBooted] = useState(false)
  const [config, setConfig] = useState<PublicConfig | null>(null)
  const [installId, setInstallId] = useState<string | null>(null)
  const lastRefresh = useRef(0)

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(dark ? colors.pageDark : colors.pageLight).catch(() => undefined)
  }, [dark])

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        await localStore.load()
      } catch (e) {
        logError(e, { action: 'boot.localStore' })
      }
      configureLogging({ appVersion, installId: localStore.installId })
      setInstallId(localStore.installId)
      void cleanupMedia().catch((e) => logError(e, { action: 'boot.cleanup' }))

      if (target) {
        lastRefresh.current = Date.now()
        const first = await withTimeout(fetchPublicConfig(target.origin, appVersion, platform), BOOT_CONFIG_WAIT_MS, null)
        if (alive) setConfig(first)
      }
      if (alive) setBooted(true)
      logEvent('boot.ready', { configured: !!target })
    })()
    return () => {
      alive = false
    }
  }, [])

  // Au retour au premier plan : relire la configuration (mise à jour forcée, toggles).
  // Sans réponse du serveur, on revient au comportement de base : aucun blocage.
  useEffect(() => {
    if (!target) return
    const sub = AppState.addEventListener('change', async (state) => {
      if (state !== 'active' || Date.now() - lastRefresh.current < REFRESH_MIN_INTERVAL_MS) return
      lastRefresh.current = Date.now()
      setConfig(await fetchPublicConfig(target.origin, appVersion, platform))
    })
    return () => sub.remove()
  }, [])

  const capabilities = useMemo(() => capabilitiesFor(config), [config])
  const environment = useMemo<Omit<NativeEnvironment, 'capabilities'> | null>(
    () =>
      installId
        ? {
            bridgeVersion: BRIDGE_VERSION,
            appVersion,
            ...(Application.nativeBuildVersion ? { buildNumber: Application.nativeBuildVersion } : {}),
            platform,
            installId,
          }
        : null,
    [installId],
  )

  useEffect(() => {
    if (!target && booted) void SplashScreen.hideAsync().catch(() => undefined)
  }, [booted])

  const decision = evaluateForceUpdate(config, platform, appVersion)
  useEffect(() => {
    if (decision.blocked) {
      logEvent('forceUpdate.blocked', { appVersion })
      void SplashScreen.hideAsync().catch(() => undefined)
    }
  }, [decision.blocked])

  let content: ReactNode = null
  if (!target) content = booted ? <SetupScreen /> : null
  else if (!booted || !environment) content = null
  else if (decision.blocked) content = <ForceUpdateScreen storeUrl={decision.storeUrl} />
  else content = <ShellScreen target={target} environment={environment} capabilities={capabilities} />

  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      {content}
      <CaptureHost />
    </SafeAreaProvider>
  )
}
