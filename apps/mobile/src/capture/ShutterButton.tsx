import { Pressable, StyleSheet, View } from 'react-native'

import { colors, touch } from '../ui/theme'

/**
 * Le déclencheur : un grand cercle, assez gros pour un pouce ganté.
 * `record` : point rouge (démarrer) ; `stop` : carré rouge (arrêter).
 */
export function ShutterButton({
  onPress,
  disabled,
  label,
  variant = 'photo',
}: {
  onPress: () => void
  disabled?: boolean
  label: string
  variant?: 'photo' | 'record' | 'stop'
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={12}
      style={({ pressed }) => [styles.ring, disabled && styles.disabled, pressed && styles.pressed]}
    >
      {variant === 'photo' ? <View style={styles.photoCore} /> : null}
      {variant === 'record' ? <View style={styles.recordCore} /> : null}
      {variant === 'stop' ? <View style={styles.stopCore} /> : null}
    </Pressable>
  )
}

const size = touch.shutter

const styles = StyleSheet.create({
  ring: {
    width: size,
    height: size,
    borderRadius: size / 2,
    borderWidth: 5,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  photoCore: { width: size - 18, height: size - 18, borderRadius: (size - 18) / 2, backgroundColor: colors.white },
  recordCore: { width: size - 22, height: size - 22, borderRadius: (size - 22) / 2, backgroundColor: colors.danger },
  stopCore: { width: 30, height: 30, borderRadius: 8, backgroundColor: colors.danger },
  pressed: { transform: [{ scale: 0.94 }] },
  disabled: { opacity: 0.4 },
})
