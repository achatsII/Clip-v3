'use client'

import { BarChart3, CalendarDays, GitCompareArrows, GraduationCap, Library, MapPin, MessageSquareWarning, Timer, TriangleAlert, Users } from 'lucide-react'
import type { ReactNode } from 'react'
import type { Family, ReportKey } from '@/lib/reports/catalog'

/** L'icône de chaque rapport, et la couleur de chaque famille (le répertoire et l'en-tête d'un rapport). */
export const REPORT_ICONS: Record<ReportKey | 'adoption', ReactNode> = {
  semaine: <CalendarDays className="h-6 w-6" />,
  temps: <Timer className="h-6 w-6" />,
  personnes: <Users className="h-6 w-6" />,
  postes: <MapPin className="h-6 w-6" />,
  ecarts: <TriangleAlert className="h-6 w-6" />,
  revision: <GitCompareArrows className="h-6 w-6" />,
  formation: <GraduationCap className="h-6 w-6" />,
  retours: <MessageSquareWarning className="h-6 w-6" />,
  bibliotheque: <Library className="h-6 w-6" />,
  adoption: <BarChart3 className="h-6 w-6" />,
}

export const FAMILY_LOOK: Record<Family, string> = {
  floor: 'from-sky-500 to-blue-700',
  quality: 'from-rose-500 to-orange-500',
  training: 'from-violet-500 to-indigo-600',
  library: 'from-emerald-400 to-teal-600',
  direction: 'from-slate-600 to-slate-800',
}
