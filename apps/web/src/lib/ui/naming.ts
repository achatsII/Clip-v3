'use client'

/**
 * Le nom affiché d'une instruction (toggle `nameTemplate`, Réglages › Classement) : les valeurs des
 * familles choisies devant le titre, « Découpe – Presse P-12 – Changer le filtre ». Dans l'app, le
 * modèle se lit dans les réglages de l'usine ; au poste (un lien public ne les lit pas), dans la
 * version publiée (`Published.namePrefix`). Toggle coupé : le titre seul, comme avant.
 */
import { useCallback, useMemo } from 'react'
import { useSession } from '@/components/providers/Session'
import { displayName, namePrefix, readNomenclature, type Labels } from '@/lib/model/nomenclature'
import { useToggle } from '@/lib/toggles'

/** Dans l'app : (titre, classement) → le nom affiché. */
export function useInstructionName(): (title: string, labels?: Labels | null) => string {
  const on = useToggle('nameTemplate')
  const classify = useToggle('nomenclature')
  const { org } = useSession()
  const nomenclature = useMemo(() => readNomenclature(org.json_data.nomenclature), [org.json_data.nomenclature])
  return useCallback((title: string, labels?: Labels | null) => (on && classify ? displayName(title, namePrefix(labels, nomenclature)) : title), [on, classify, nomenclature])
}

/** Dans l'app : le début du nom (pour le lecteur, qui le pose devant le titre dans chaque langue) ; vide sans modèle. */
export function useInstructionPrefix(): (labels?: Labels | null) => string {
  const on = useToggle('nameTemplate')
  const classify = useToggle('nomenclature')
  const { org } = useSession()
  const nomenclature = useMemo(() => readNomenclature(org.json_data.nomenclature), [org.json_data.nomenclature])
  return useCallback((labels?: Labels | null) => (on && classify ? namePrefix(labels, nomenclature) : ''), [on, classify, nomenclature])
}

/** Au poste et sur un lien : le nom affiché d'une version publiée. */
export function usePublishedName(): (title: string, prefix?: string | null) => string {
  const on = useToggle('nameTemplate')
  return useCallback((title: string, prefix?: string | null) => (on ? displayName(title, prefix) : title), [on])
}

/** Au poste et sur un lien : le début du nom gardé dans la version publiée, pour le lecteur ; null toggle coupé. */
export function usePublishedPrefix(): (prefix?: string | null) => string | null {
  const on = useToggle('nameTemplate')
  return useCallback((prefix?: string | null) => (on && prefix ? prefix : null), [on])
}
