import Feather from '@expo/vector-icons/Feather'
import { Linking, StyleSheet, Text, View } from 'react-native'

import { GlassButton, PrimaryButton, type IconName } from '../ui/components'
import { colors, radii, type } from '../ui/theme'
import { useStrings } from '../i18n'

/**
 * Ce que voit la personne quand une permission manque : pourquoi, et le seul geste utile
 * (autoriser, ou ouvrir les réglages si le système ne redemande plus).
 */
export function PermissionPanel({
  icon,
  title,
  message,
  canAskAgain,
  onRequest,
  onCancel,
  alternative,
}: {
  icon: IconName
  title: string
  message: string
  canAskAgain: boolean
  onRequest: () => void
  onCancel: () => void
  /** Un autre chemin possible sans la permission (ex. filmer sans le son). */
  alternative?: { label: string; icon: IconName; onPress: () => void }
}) {
  const t = useStrings()
  return (
    <View style={styles.wrap}>
      <View style={styles.iconBox}>
        <Feather name={icon} size={40} color={colors.white} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      <View style={styles.actions}>
        {canAskAgain ? (
          <PrimaryButton label={t.common.allow} icon="check" onPress={onRequest} />
        ) : (
          <PrimaryButton label={t.common.openSettings} icon="settings" onPress={() => Linking.openSettings()} />
        )}
        {alternative ? (
          <GlassButton label={alternative.label} icon={alternative.icon} onPress={alternative.onPress} />
        ) : null}
        <GlassButton label={t.common.cancel} onPress={onCancel} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: colors.pageDark,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 16,
  },
  iconBox: {
    width: 88,
    height: 88,
    borderRadius: radii.lg,
    backgroundColor: 'rgba(0,120,255,0.25)',
    borderWidth: 1,
    borderColor: colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  title: { ...type.title, color: colors.white, textAlign: 'center' },
  message: { ...type.body, color: 'rgba(255,255,255,0.78)', textAlign: 'center', maxWidth: 420 },
  actions: { alignSelf: 'stretch', gap: 12, marginTop: 12, maxWidth: 420, width: '100%', alignItems: 'stretch' },
})
