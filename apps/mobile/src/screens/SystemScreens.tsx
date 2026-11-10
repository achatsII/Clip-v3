import { Linking } from 'react-native'

import { PrimaryButton } from '../ui/components'
import { MessageScreen } from './MessageScreen'

/** L'adresse de l'app web n'a pas été fournie à la build : rien à charger. */
export function SetupScreen() {
  return (
    <MessageScreen
      icon="tool"
      title="Adresse de l’app web manquante"
      message={
        __DEV__
          ? 'Définissez EXPO_PUBLIC_CLIP_WEB_URL dans apps/mobile/.env (l’adresse de l’app web CLIP, ex. l’adresse IP de votre poste en développement), puis relancez Metro.'
          : 'Cette version de CLIP a été construite sans l’adresse de son service. Installez la version publiée par votre organisation.'
      }
    />
  )
}

/** Le serveur dit que cette version de la coquille est trop vieille : seul geste, mettre à jour. */
export function ForceUpdateScreen({ storeUrl }: { storeUrl: string | null }) {
  return (
    <MessageScreen
      icon="download-cloud"
      title="Une mise à jour de CLIP est requise"
      message="Cette version n’est plus prise en charge. Mettez l’app à jour pour continuer à capturer et consulter vos instructions."
      footnote={storeUrl ? undefined : 'Ouvrez le magasin d’applications de votre appareil pour mettre CLIP à jour.'}
    >
      {storeUrl ? (
        <PrimaryButton label="Mettre à jour" icon="arrow-up-circle" onPress={() => void Linking.openURL(storeUrl)} />
      ) : null}
    </MessageScreen>
  )
}

/** La page n'a pas pu être chargée (réseau, serveur). */
export function OfflineScreen({ onRetry, detail }: { onRetry: () => void; detail?: string }) {
  return (
    <MessageScreen
      icon="wifi-off"
      tone="danger"
      title="Pas de connexion"
      message="CLIP n’arrive pas à joindre son service. Vérifiez le Wi-Fi ou les données cellulaires, puis réessayez."
      footnote={detail}
    >
      <PrimaryButton label="Réessayer" icon="refresh-cw" onPress={onRetry} />
    </MessageScreen>
  )
}
