import Feather from '@expo/vector-icons/Feather'
import { BlurView } from 'expo-blur'
import { LinearGradient } from 'expo-linear-gradient'
import type { ComponentProps, ReactNode } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native'

import { colors, radii, shadowPrimary, touch, type } from './theme'

export type IconName = ComponentProps<typeof Feather>['name']

const pressedStyle = { transform: [{ scale: 0.96 }], opacity: 0.92 }

interface ButtonProps {
  label: string
  onPress: () => void
  icon?: IconName
  disabled?: boolean
  loading?: boolean
  style?: StyleProp<ViewStyle>
  accessibilityHint?: string
}

/** L'action principale de l'écran : pilule au dégradé bleu II. Une seule par écran. */
export function PrimaryButton({ label, onPress, icon, disabled, loading, style, accessibilityHint }: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!disabled, busy: !!loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [styles.primaryWrap, disabled && styles.disabled, pressed && pressedStyle, style]}
    >
      <LinearGradient
        colors={colors.gradientPrimary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.primary}
      >
        {loading ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <>
            {icon ? <Feather name={icon} size={22} color={colors.white} /> : null}
            <Text style={styles.primaryLabel}>{label}</Text>
          </>
        )}
      </LinearGradient>
    </Pressable>
  )
}

/** Action secondaire : verre neutre. */
export function GlassButton({ label, onPress, icon, disabled, style, dark = true }: ButtonProps & { dark?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.glass,
        dark ? styles.glassDark : styles.glassLight,
        disabled && styles.disabled,
        pressed && pressedStyle,
        style,
      ]}
    >
      {icon ? <Feather name={icon} size={20} color={dark ? colors.white : colors.ink} /> : null}
      <Text style={[styles.glassLabel, { color: dark ? colors.white : colors.ink }]}>{label}</Text>
    </Pressable>
  )
}

/** Bouton rond à icône sur verre sombre (caméra). */
export function IconButton({
  icon,
  label,
  onPress,
  size = touch.large,
  active,
  disabled,
}: {
  icon: IconName
  label: string
  onPress: () => void
  size?: number
  active?: boolean
  disabled?: boolean
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: !!active, disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [
        styles.iconButton,
        { width: size, height: size, borderRadius: size / 2 },
        active && styles.iconButtonActive,
        disabled && styles.disabled,
        pressed && pressedStyle,
      ]}
    >
      <Feather name={icon} size={Math.round(size * 0.42)} color={active ? colors.ink : colors.white} />
    </Pressable>
  )
}

/** Panneau de verre sombre posé sur la caméra. */
export function GlassPanel({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.panel, style]}>
      <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
      {children}
    </View>
  )
}

/** Pastille d'état (minuterie, compteur). */
export function Pill({ children, tone = 'glass' }: { children: ReactNode; tone?: 'glass' | 'danger' }) {
  return (
    <View style={[styles.pill, tone === 'danger' ? styles.pillDanger : styles.pillGlass]}>
      {typeof children === 'string' ? <Text style={styles.pillText}>{children}</Text> : children}
    </View>
  )
}

const styles = StyleSheet.create({
  primaryWrap: { borderRadius: radii.pill, ...shadowPrimary },
  primary: {
    minHeight: touch.large,
    paddingHorizontal: 28,
    borderRadius: radii.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  primaryLabel: { color: colors.white, fontSize: 18, fontWeight: '900', letterSpacing: 0.4 },
  glass: {
    minHeight: touch.min + 8,
    paddingHorizontal: 20,
    borderRadius: radii.pill,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  glassDark: { backgroundColor: 'rgba(255,255,255,0.12)', borderColor: colors.glassBorder },
  glassLight: { backgroundColor: 'rgba(255,255,255,0.6)', borderColor: colors.glassBorderLight },
  glassLabel: { fontSize: 16, fontWeight: '800' },
  iconButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(10,15,24,0.45)',
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  iconButtonActive: { backgroundColor: colors.white },
  disabled: { opacity: 0.45 },
  panel: {
    overflow: 'hidden',
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.glassDark,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  pillGlass: { backgroundColor: 'rgba(10,15,24,0.55)', borderColor: colors.glassBorder },
  pillDanger: { backgroundColor: colors.danger, borderColor: 'rgba(255,255,255,0.25)' },
  pillText: { color: colors.white, ...type.timer, fontSize: 16 },
})
