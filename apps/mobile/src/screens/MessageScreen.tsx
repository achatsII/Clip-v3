import Feather from '@expo/vector-icons/Feather'
import { LinearGradient } from 'expo-linear-gradient'
import type { ReactNode } from 'react'
import { StyleSheet, Text, View, useColorScheme } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import type { IconName } from '../ui/components'
import { colors, radii, type } from '../ui/theme'

/**
 * Gabarit des écrans natifs pleins (configuration, mise à jour, hors connexion) : une icône,
 * un titre, une phrase, une seule action principale.
 */
export function MessageScreen({
  icon,
  tone = 'primary',
  title,
  message,
  children,
  footnote,
}: {
  icon: IconName
  tone?: 'primary' | 'danger'
  title: string
  message: string
  children?: ReactNode
  footnote?: string
}) {
  const dark = useColorScheme() === 'dark'
  return (
    <SafeAreaView style={[styles.page, { backgroundColor: dark ? colors.pageDark : colors.pageLight }]}>
      <View style={styles.content}>
        <LinearGradient
          colors={tone === 'danger' ? colors.gradientDanger : colors.gradientPrimary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.iconBox}
        >
          <Feather name={icon} size={44} color={colors.white} />
        </LinearGradient>
        <Text style={[styles.title, { color: dark ? colors.white : colors.ink }]}>{title}</Text>
        <Text style={[styles.message, { color: dark ? 'rgba(255,255,255,0.78)' : colors.inkSoft }]}>{message}</Text>
        <View style={styles.actions}>{children}</View>
        {footnote ? (
          <Text style={[styles.footnote, { color: dark ? 'rgba(255,255,255,0.5)' : colors.inkSoft }]}>{footnote}</Text>
        ) : null}
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 14 },
  iconBox: {
    width: 96,
    height: 96,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  title: { ...type.hero, textAlign: 'center', maxWidth: 480 },
  message: { ...type.body, textAlign: 'center', maxWidth: 440, lineHeight: 23 },
  actions: { width: '100%', maxWidth: 420, gap: 12, marginTop: 14 },
  footnote: { fontSize: 12, fontWeight: '600', textAlign: 'center', maxWidth: 440, marginTop: 8 },
})
