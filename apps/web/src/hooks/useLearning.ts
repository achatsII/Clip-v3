'use client'

/**
 * Les gestes de l'IA qui apprend (toggle `learnFromEdits`) : une règle gardée pour soi ou pour toute
 * l'usine, une proposition refusée, un modèle ajouté. Pour soi : la fiche `clip_writing` de la
 * personne, versionnée. Pour l'usine (droit de régler, `settings`) : une nouvelle version du standard.
 */
import { useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { useSession } from '@/components/providers/Session'
import type { Proposal } from '@/lib/learning/proposals'
import { applyToStandard, MAX_MY_EXAMPLES, MAX_ORG_EXAMPLES, nextStandard, readPersonal, savePersonal, withExample } from '@/lib/learning/store'
import type { Doc } from '@/lib/gateway/data'
import type { ModelExample, PersonalWriting, WritingStandard } from '@/lib/model/types'
import { usePersonalWriting, writingKey } from './useWriting'

export function useLearning() {
  const { data, org, updateOrg, displayName, profile, can } = useSession()
  const qc = useQueryClient()
  const personal = usePersonalWriting()
  const isAdmin = can('settings', 'write')
  const userId = profile.userId

  /** La fiche à jour : celle du cache, ou relue. */
  const current = useCallback(() => qc.getQueryData<Doc<PersonalWriting> | null>(writingKey(userId)) ?? personal.data ?? null, [qc, userId, personal.data])

  const saveMine = useCallback(
    async (change: (p: PersonalWriting) => Partial<Pick<PersonalWriting, 'rules' | 'learnings' | 'examples' | 'answered'>>) => {
      const doc = current()
      const next = await savePersonal(data, doc, userId, change(readPersonal(doc?.json_data, userId)))
      qc.setQueryData(writingKey(userId), next)
      return next
    },
    [current, data, userId, qc],
  )

  /** Le standard de l'usine changé : une nouvelle version, l'ancienne dans l'historique. */
  const saveOrg = useCallback(
    async (change: (s: WritingStandard) => WritingStandard, extra: Record<string, unknown> = {}) => {
      const next = nextStandard(org.json_data, change(org.json_data.standard), displayName)
      await updateOrg({ ...next, ...extra })
      return next.standard.version
    },
    [org.json_data, displayName, updateOrg],
  )

  return {
    isAdmin,
    personal: personal.data?.json_data ?? null,
    personalDoc: personal.data ?? null,
    loading: personal.isLoading,
    saveMine,
    saveOrg,
    /** Une proposition gardée pour soi : sa règle rejoint mes préférences. */
    forMe: (p: Pick<Proposal, 'key' | 'rule'>) => saveMine((m) => ({ rules: m.rules.includes(p.rule) ? m.rules : [...m.rules, p.rule], answered: { ...m.answered, [p.key]: 'yes' } })),
    /** Une proposition gardée pour l'usine : le standard change de version. Rend la nouvelle version. */
    forOrg: (p: Pick<Proposal, 'key' | 'rule' | 'maxWords' | 'term'>) => saveOrg((s) => applyToStandard(s, p), { learningAnswered: { ...(org.json_data.learningAnswered ?? {}), [p.key]: 'yes' } }),
    /** Une proposition refusée : elle ne revient pas (pour l'usine, si on la refuse au nom de l'usine). */
    dismiss: async (p: Pick<Proposal, 'key'>, scope: 'me' | 'org') => {
      if (scope === 'org') await updateOrg({ learningAnswered: { ...(org.json_data.learningAnswered ?? {}), [p.key]: 'no' } })
      else await saveMine((m) => ({ answered: { ...m.answered, [p.key]: 'no' } }))
    },
    /** Une instruction modèle, pour soi ou pour l'usine ; ses règles avec elle. */
    addModel: async (ex: ModelExample, rules: string[], scope: 'me' | 'org') => {
      if (scope === 'org') return saveOrg((s) => ({ ...s, rules: [...s.rules, ...rules.filter((r) => !s.rules.includes(r))], examples: withExample(s.examples, ex, MAX_ORG_EXAMPLES) }))
      await saveMine((m) => ({ rules: [...m.rules, ...rules.filter((r) => !m.rules.includes(r))], examples: withExample(m.examples, ex, MAX_MY_EXAMPLES) }))
      return null
    },
  }
}
