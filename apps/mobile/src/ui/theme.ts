/**
 * Les tokens de la coquille, transposés de la direction « Glassmorphism Industriel Premium »
 * (skill ux-design-ii) : bleu II en dégradé pour l'action principale, verre sombre sur la
 * caméra, rayons généreux, gros boutons utilisables avec des gants.
 */
export const colors = {
  primary: '#0078FF',
  primaryStrong: '#0056D6',
  gradientPrimary: ['#00C6FF', '#0078FF'] as const,
  danger: '#FF2B5E',
  gradientDanger: ['#FF2B5E', '#FF6B00'] as const,
  success: '#18c480',
  warning: '#FFC800',
  white: '#FFFFFF',
  ink: '#0F172A',
  inkSoft: '#64748B',
  pageLight: '#F8FAFC',
  pageDark: '#0A0F18',
  slate850: '#151E2E',
  glassDark: 'rgba(10, 15, 24, 0.45)',
  glassBorder: 'rgba(255, 255, 255, 0.16)',
  glassLight: 'rgba(255, 255, 255, 0.70)',
  glassBorderLight: 'rgba(255, 255, 255, 0.80)',
} as const

export const radii = { sm: 12, md: 16, lg: 24, xl: 32, pill: 999 } as const

/** Cibles tactiles : 44 pt au minimum, nettement plus pour les gestes de capture. */
export const touch = { min: 44, large: 64, shutter: 84 } as const

export const type = {
  hero: { fontSize: 30, fontWeight: '900' as const, letterSpacing: -0.8 },
  title: { fontSize: 22, fontWeight: '900' as const, letterSpacing: -0.4 },
  body: { fontSize: 16, fontWeight: '600' as const },
  label: { fontSize: 11, fontWeight: '900' as const, letterSpacing: 1.6, textTransform: 'uppercase' as const },
  timer: { fontSize: 20, fontWeight: '900' as const, fontVariant: ['tabular-nums' as const] },
}

export const shadowPrimary = {
  shadowColor: '#0078FF',
  shadowOpacity: 0.3,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 8 },
  elevation: 8,
} as const
