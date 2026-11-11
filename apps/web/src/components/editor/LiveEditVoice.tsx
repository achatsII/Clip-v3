'use client'

import { Mic, MicOff, Square } from 'lucide-react'
import { useRef } from 'react'
import { useSession } from '@/components/providers/Session'
import { useLiveVoice, type LiveTool } from '@/lib/ai/useLiveVoice'
import type { InstructionContent } from '@/lib/model/types'
import { cn } from '@/lib/util/cn'

export interface VoiceTurnResult {
  reply: string
  done: string[]
  failed: string[]
}

const TOOLS: LiveTool[] = [
  {
    name: 'modifier',
    description:
      "Fait un changement dans l'instruction : textes, étapes (ajouter, retirer, déplacer), mises en garde, marques précises sur une photo, schéma, illustration, à faire / à éviter. Rend ce qui a été fait. La demande doit être complète : l'étape visée (numéro ET titre), ce qu'il faut faire, les textes exacts.",
    parameters: { type: 'OBJECT', properties: { demande: { type: 'STRING', description: 'La demande complète, comme on l’écrirait à un rédacteur' } }, required: ['demande'] },
  },
  {
    name: 'aller_a_etape',
    description: "Montre l'étape demandée à l'écran (1 = première).",
    parameters: { type: 'OBJECT', properties: { numero: { type: 'NUMBER', description: "Numéro de l'étape, 1 = première" } }, required: ['numero'] },
  },
  { name: 'lire_instruction', description: "Rend l'instruction telle qu'elle est maintenant : titre et étapes numérotées.", parameters: { type: 'OBJECT', properties: {} } },
  { name: 'annuler_dernier_changement', description: 'Annule le dernier changement fait par l’assistant.', parameters: { type: 'OBJECT', properties: {} } },
]

function outline(content: InstructionContent) {
  return { titre: content.title, etapes: content.steps.map((s, i) => ({ numero: i + 1, titre: s.title, texte: s.text, medias: s.media.length, mise_en_garde: s.warning?.text ?? null })) }
}

function systemPrompt(content: InstructionContent) {
  const steps = content.steps.map((s, i) => `${i + 1}. ${s.title} — ${s.text}`).join('\n')
  return `Tu es l’assistant vocal d’édition de CLIP. La personne modifie une instruction de travail d’usine en te parlant, souvent les mains occupées. Parle français du Québec, phrases très courtes, ton calme.
- Pour TOUT changement, appelle VRAIMENT la fonction modifier, avec une demande complète et précise (étape visée par son numéro et son titre, ce qu’il faut faire, les textes exacts). Ne dis jamais qu’un changement est fait avant la réponse de modifier ; ensuite, résume en une phrase ce qui a été fait.
- Tu ne vois pas les photos : décris précisément ce qu’il faut marquer (objet, forme, couleur, texte) ; l’outil s’en charge.
- Pour montrer une étape, appelle aller_a_etape. Après plusieurs changements, appelle lire_instruction avant de citer un numéro d’étape.
- « Annule », « reviens en arrière » : appelle annuler_dernier_changement.
- Demande floue : pose UNE question courte. N’invente aucune valeur (couple, pression, cote).

INSTRUCTION « ${content.title} » :
${steps}`
}

/**
 * L'assistant d'édition, à la voix : on lui parle, il répond, et chaque changement passe par le
 * même moteur que le clavardage (on le voit s'appliquer, il s'ajoute à la conversation).
 */
export function LiveEditVoice({
  content,
  onModify,
  onGoTo,
  onUndo,
  onStop,
}: {
  content: InstructionContent
  onModify: (request: string) => Promise<VoiceTurnResult>
  onGoTo: (stepId: string) => void
  onUndo: () => string
  onStop: () => void
}) {
  const { ai } = useSession()
  const latest = useRef(content)
  latest.current = content

  const onTool = async (name: string, args: Record<string, unknown>): Promise<Record<string, unknown>> => {
    if (name === 'modifier') {
      const demande = String(args.demande ?? '').trim()
      if (!demande) return { ok: false, motif: 'Demande vide' }
      const r = await onModify(demande)
      return { ok: r.failed.length === 0, reponse: r.reply, fait: r.done, echecs: r.failed, instruction: outline(latest.current) }
    }
    if (name === 'aller_a_etape') {
      const k = Math.round(Number(args.numero))
      const step = latest.current.steps[k - 1]
      if (!step) return { ok: false, motif: `Il y a ${latest.current.steps.length} étapes.` }
      onGoTo(step.id)
      return { ok: true, etape: k, titre: step.title }
    }
    if (name === 'lire_instruction') return outline(latest.current)
    if (name === 'annuler_dernier_changement') return { ok: true, message: onUndo() }
    return { ok: false, motif: 'Fonction inconnue' }
  }

  const { state, lines, muted, setMuted, level } = useLiveVoice({
    ai,
    systemPrompt: () => systemPrompt(latest.current),
    tools: TOOLS,
    greeting: 'Bonjour. Dis en une phrase que tu peux modifier l’instruction à la voix, et demande ce qu’il faut changer.',
    onTool,
  })

  return (
    <div className="shrink-0 border-t border-slate-900/5 bg-violet-50/70 px-4 py-3 dark:border-white/5 dark:bg-violet-500/10">
      <div className="flex items-center gap-3">
        <span className="relative flex h-12 w-12 shrink-0 items-center justify-center">
          <span className="bg-gradient-accent absolute inset-0 rounded-full opacity-30 transition-transform duration-100" style={{ transform: `scale(${1 + level * 0.5})` }} />
          <span className={cn('bg-gradient-accent relative flex h-10 w-10 items-center justify-center rounded-full text-white', state === 'connecting' && 'animate-pulse')}>
            <Mic className="h-5 w-5" />
          </span>
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black">{state === 'connecting' ? 'Connexion…' : state === 'error' ? 'Assistant vocal indisponible' : muted ? 'Micro coupé' : 'Je vous écoute'}</p>
          <p className="truncate text-xs font-bold text-slate-500">{state === 'error' ? 'Vérifiez le micro et la connexion.' : '« À l’étape 3, encercle le bouton vert »'}</p>
        </div>
        <button type="button" onClick={() => setMuted((m) => !m)} disabled={state !== 'listening'} aria-label={muted ? 'Activer le micro' : 'Couper le micro'} className="btn-press flex h-11 w-11 items-center justify-center rounded-2xl bg-white/70 disabled:opacity-40 dark:bg-white/10">
          {muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </button>
        <button type="button" onClick={onStop} aria-label="Arrêter la conversation vocale" className="btn-press flex h-11 w-11 items-center justify-center rounded-2xl bg-white/70 text-rose-600 dark:bg-white/10">
          <Square className="h-4 w-4 fill-current" />
        </button>
      </div>
      {lines.length > 0 && (
        <div className="mt-2 max-h-24 space-y-1 overflow-y-auto">
          {lines.slice(-3).map((l, i) => (
            <p key={i} className={cn('text-xs font-bold', l.who === 'user' ? 'text-slate-500' : 'text-violet-800 dark:text-violet-200')}>
              {l.who === 'user' ? 'Vous : ' : 'Assistant : '}
              {l.text}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}
