import { Pressable, StyleSheet, Text } from 'react-native'

import { colors, touch } from '../ui/theme'
import { useStrings } from '../i18n'

/** Visible seulement quand la caméra est zoomée : un toucher revient au cadrage normal. */
export function ZoomReset({ zoom, onReset }: { zoom: number; onReset: () => void }) {
  const t = useStrings()
  if (zoom < 0.01) return null
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t.common.zoomReset}
      onPress={onReset}
      hitSlop={8}
      style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
    >
      <Text style={styles.text}>1×</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  chip: {
    minWidth: touch.min,
    height: touch.min,
    paddingHorizontal: 14,
    borderRadius: touch.min / 2,
    backgroundColor: 'rgba(15,23,42,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.8 },
  text: { color: colors.white, fontSize: 16, fontWeight: '900' },
})
