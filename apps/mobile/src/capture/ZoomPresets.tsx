import { Pressable, StyleSheet, Text, View } from 'react-native'

import { useStrings } from '../i18n'
import { colors, touch } from '../ui/theme'
import { activePreset, zoomPresets, type ZoomRange } from './zoomMath'

/**
 * Les boutons d'objectif, comme dans l'appareil photo : 0,5× (ultra grand-angle, si le téléphone
 * en a un), 1×, 2×. Le bouton allumé montre le grossissement exact pendant qu'on pince (« 1,4× »).
 */
export function ZoomPresets({ range, magnification, onPick }: { range: ZoomRange; magnification: number; onPick: (m: number) => void }) {
  const t = useStrings()
  const presets = zoomPresets(range)
  const active = activePreset(presets, magnification)
  return (
    <View style={styles.row}>
      {presets.map((p) => {
        const on = p === active
        const label = t.common.zoomLabel(on ? magnification : p)
        return (
          <Pressable
            key={p}
            accessibilityRole="button"
            accessibilityLabel={t.common.zoomTo(t.common.zoomLabel(p))}
            accessibilityState={{ selected: on }}
            onPress={() => onPick(p)}
            hitSlop={4}
            style={({ pressed }) => [styles.chip, on && styles.on, pressed && styles.pressed]}
          >
            <Text style={[styles.text, on && styles.textOn]}>{label}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignSelf: 'center', gap: 6, padding: 4, borderRadius: touch.min, backgroundColor: 'rgba(15,23,42,0.45)' },
  chip: {
    minWidth: touch.min,
    height: touch.min,
    paddingHorizontal: 8,
    borderRadius: touch.min / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  on: { backgroundColor: 'rgba(15,23,42,0.85)' },
  pressed: { opacity: 0.8 },
  text: { color: colors.white, fontSize: 13, fontWeight: '800' },
  textOn: { color: '#FFD60A', fontSize: 15, fontWeight: '900' },
})
