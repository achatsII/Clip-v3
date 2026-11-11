import { Linking } from 'react-native'

import { PrimaryButton } from '../ui/components'
import { MessageScreen } from './MessageScreen'
import { useStrings } from '../i18n'

/** L'adresse de l'app web n'a pas été fournie à la build : rien à charger. */
export function SetupScreen() {
  const t = useStrings()
  return (
    <MessageScreen
      icon="tool"
      title={t.system.setupTitle}
      message={
        __DEV__
          ? t.system.setupDev
          : t.system.setupProd
      }
    />
  )
}

/** Le serveur dit que cette version de la coquille est trop vieille : seul geste, mettre à jour. */
export function ForceUpdateScreen({ storeUrl }: { storeUrl: string | null }) {
  const t = useStrings()
  return (
    <MessageScreen
      icon="download-cloud"
      title={t.system.updateTitle}
      message={t.system.updateMessage}
      footnote={storeUrl ? undefined : t.system.updateFootnote}
    >
      {storeUrl ? (
        <PrimaryButton label={t.system.updateButton} icon="arrow-up-circle" onPress={() => void Linking.openURL(storeUrl)} />
      ) : null}
    </MessageScreen>
  )
}

/** La page n'a pas pu être chargée (réseau, serveur). */
export function OfflineScreen({ onRetry, detail }: { onRetry: () => void; detail?: string }) {
  const t = useStrings()
  return (
    <MessageScreen
      icon="wifi-off"
      tone="danger"
      title={t.system.offlineTitle}
      message={t.system.offlineMessage}
      footnote={detail}
    >
      <PrimaryButton label={t.common.retry} icon="refresh-cw" onPress={onRetry} />
    </MessageScreen>
  )
}
