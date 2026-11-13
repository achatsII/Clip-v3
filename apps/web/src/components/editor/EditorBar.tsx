'use client'

import { ArrowLeft, Eye, LayoutList, Loader2, MessageCircle, MessageCircleQuestion, MonitorSmartphone, MoreHorizontal, PencilLine, Sparkles } from 'lucide-react'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { Menu, type MenuItem } from '@/components/ui/Menu'
import type { DraftHistory } from '@/hooks/useDraftHistory'
import { useMessages } from '@/lib/i18n'
import { useEditorViewsSeen, type EditorView } from '@/lib/ui/editorView'
import { useMediaQuery } from '@/lib/ui/screen'
import { cn } from '@/lib/util/cn'
import { ASSIST_ACTIONS, type useStepAssist } from './StepAssist'
import { UndoButtons } from './UndoControls'

/** Un bouton-icône de l'éditeur : 44 px, discret. */
export const iconButton = 'btn-press flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-slate-600 hover:bg-slate-900/5 disabled:opacity-30 dark:text-slate-300 dark:hover:bg-white/10'

/** Les façons de modifier (toggle `editorViews`) : la vue en cours, en changer, et l'aperçu. */
export interface ViewsControl {
  current: EditorView
  onChange: (v: EditorView) => void
  onPreview: () => void
}

/** L'en-tête de l'instruction : ce qui la concerne en entier, et rien d'autre. */
export interface StageTop {
  /** Son titre ; le toucher ouvre ses infos (titre, résumé, postes, fiche). */
  title: string
  /** Où elle en est : publication et enregistrement. */
  status: ReactNode
  statusTone?: 'live' | 'error'
  /** L'action principale (publier, demander l'approbation, approuver) ; rien quand tout est publié. */
  primary: (compact: boolean) => ReactNode
  /** Le reste, rangé dans « … ». */
  menu: MenuItem[]
  onInfo: () => void
  /** Le nom de ce geste, quand ce n'est pas celui d'une instruction (un bloc commun n'a pas de poste). */
  infoLabel?: string
  /** Les points que l'IA demande de vérifier : une pastille qui ouvre les questions. */
  questions: number
  onQuestions: () => void
  /** Absent : une seule façon de modifier (toggle coupé). */
  views?: ViewsControl
}

type StepAssistState = ReturnType<typeof useStepAssist>

export function BackLink() {
  const t = useMessages()
  return (
    <Link href="/instructions" aria-label={t.editor.page.backToList} title={t.editor.page.backToList} className={iconButton}>
      <ArrowLeft className="h-5 w-5" />
    </Link>
  )
}

/** Le titre de l'instruction et son état ; le toucher ouvre ses infos. */
export function TitleButton({ top, readOnly }: { top: StageTop; readOnly?: boolean }) {
  const t = useMessages()
  return (
    <button type="button" onClick={top.onInfo} title={top.infoLabel ?? t.editor.page.info.open} className="btn-press group flex min-h-11 max-w-full min-w-0 items-center gap-1.5 rounded-2xl px-2 text-left hover:bg-slate-900/5 dark:hover:bg-white/10">
      <span className="min-w-0">
        <span className="block truncate text-sm font-black text-slate-900 dark:text-white">{top.title.trim() || t.editor.page.info.untitled}</span>
        <span className={cn('block truncate text-xs font-bold', top.statusTone === 'live' ? 'text-[var(--primary)]' : top.statusTone === 'error' ? 'text-rose-600' : 'text-slate-400')} aria-live="polite">
          {top.status}
        </span>
      </span>
      {!readOnly && <PencilLine className="h-4 w-4 shrink-0 text-slate-400 transition lg:opacity-0 lg:group-hover:opacity-100" />}
    </button>
  )
}

/** « 2 à vérifier » : les questions de l'IA, une à la fois. */
export function QuestionsPill({ top, className }: { top: StageTop; className?: string }) {
  const t = useMessages()
  return (
    <button type="button" onClick={top.onQuestions} className={cn('btn-press flex min-h-11 shrink-0 items-center gap-1.5 rounded-2xl bg-amber-100 px-3 text-xs font-black text-amber-900 dark:bg-amber-500/20 dark:text-amber-100', className)}>
      <MessageCircleQuestion className="h-4 w-4 shrink-0" /> {t.editor.page.questions.pill(top.questions)}
    </button>
  )
}

/** Le « … » de l'instruction. */
export function InstructionMenu({ menu }: { menu: MenuItem[] }) {
  const t = useMessages()
  return <Menu bare label={t.editor.page.menu.label} items={menu} trigger={<span className={iconButton}><MoreHorizontal className="h-5 w-5" /></span>} />
}

/**
 * Le seul bouton de l'IA : les retouches de l'étape en un geste, et la conversation avec
 * l'assistant pour tout le reste. Il tourne pendant qu'elle travaille. Sans étape à retoucher
 * (l'instruction entière est ouverte), il ouvre directement la conversation.
 */
export function AssistMenu({ assist, onAssistant, compact, side }: { assist: StepAssistState | null; onAssistant: () => void; compact?: boolean; side?: 'up' }) {
  const t = useMessages()
  const look = cn('btn-press bg-gradient-accent shadow-accent flex h-11 shrink-0 items-center gap-1.5 rounded-2xl text-sm font-black text-white', compact ? 'w-11 justify-center' : 'px-3.5')
  const face = (
    <>
      {assist?.busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
      {!compact && t.editor.stage.assistant}
    </>
  )
  if (!assist) {
    return (
      <button type="button" onClick={onAssistant} aria-label={t.editor.stage.assistant} title={t.editor.stage.assistant} className={look}>
        {face}
      </button>
    )
  }
  const items: MenuItem[] = [
    ...ASSIST_ACTIONS.map((k) => ({ label: t.editor.assist.actions[k], icon: <Sparkles className="h-4 w-4" />, onClick: () => void assist.run(k), disabled: !!assist.busy })),
    { label: t.editor.stage.askAssistant, icon: <MessageCircle className="h-4 w-4" />, onClick: onAssistant, divider: true },
  ]
  return <Menu bare side={side} label={t.editor.stage.assistant} items={items} trigger={<span className={look}>{face}</span>} />
}

const VIEW_ICONS: Record<EditorView, (cls: string) => ReactNode> = {
  stage: (cls) => <MonitorSmartphone className={cls} />,
  form: (cls) => <LayoutList className={cls} />,
}

/**
 * Au bureau : les deux façons de modifier, côte à côte et nommées (on voit dans laquelle on est,
 * et qu'il y en a une autre), puis l'aperçu, l'œil. `compact` : les icônes seules, quand la place
 * manque (le panneau de l'assistant est ouvert, ou l'écran est étroit).
 */
export function ViewSwitch({ views, compact }: { views: ViewsControl; compact?: boolean }) {
  const t = useMessages().editor.views
  const names: Record<EditorView, { label: string; hint: string }> = { stage: { label: t.stage, hint: t.stageHint }, form: { label: t.form, hint: t.formHint } }
  return (
    <div className="flex shrink-0 items-center gap-1">
      <div role="radiogroup" aria-label={t.label} className="glass-input flex items-center gap-0.5 rounded-2xl p-0.5">
        {(['stage', 'form'] as const).map((v) => {
          const on = views.current === v
          return (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={compact ? names[v].label : undefined}
              title={`${names[v].label} — ${names[v].hint}`}
              onClick={() => !on && views.onChange(v)}
              className={cn(
                'btn-press flex h-11 items-center gap-1.5 rounded-[14px] text-sm font-black whitespace-nowrap',
                compact ? 'w-11 justify-center' : 'px-3',
                on ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white',
              )}
            >
              {VIEW_ICONS[v]('h-4 w-4 shrink-0')}
              {!compact && names[v].label}
            </button>
          )
        })}
      </div>
      <button type="button" onClick={views.onPreview} aria-label={compact ? t.preview : undefined} title={t.previewTitle} className={cn('btn-press flex h-11 shrink-0 items-center gap-1.5 rounded-2xl text-sm font-black text-slate-600 hover:bg-slate-900/5 dark:text-slate-300 dark:hover:bg-white/10', compact ? 'w-11 justify-center' : 'px-3')}>
        <Eye className="h-5 w-5 shrink-0" /> {!compact && t.preview}
      </button>
    </div>
  )
}

/**
 * Au téléphone : un seul bouton discret, sous le pouce, à gauche de la barre du bas. Son icône dit
 * la vue en cours ; il ouvre les deux façons de modifier, chacune expliquée, et l'aperçu. Un point
 * bleu l'annonce jusqu'à la première ouverture.
 */
export function ViewMenu({ views }: { views: ViewsControl }) {
  const t = useMessages().editor.views
  const [seen, markSeen] = useEditorViewsSeen()
  const items: MenuItem[] = [
    { label: t.stage, description: t.stageHint, icon: VIEW_ICONS.stage('h-5 w-5'), checked: views.current === 'stage', onClick: () => views.onChange('stage') },
    { label: t.form, description: t.formHint, icon: VIEW_ICONS.form('h-5 w-5'), checked: views.current === 'form', onClick: () => views.onChange('form') },
    { label: t.preview, description: t.previewHint, icon: <Eye className="h-5 w-5" />, onClick: views.onPreview, divider: true },
  ]
  return (
    // La première ouverture éteint le point (on sait désormais qu'il y a d'autres vues).
    <div className="shrink-0" onClickCapture={markSeen}>
      <Menu
        bare
        side="up"
        align="left"
        label={t.choose}
        items={items}
        trigger={
          <span className={cn(iconButton, 'relative')}>
            {VIEW_ICONS[views.current]('h-5 w-5')}
            {!seen && <span className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full bg-[var(--primary)] ring-2 ring-white dark:ring-slate-900" aria-hidden />}
          </span>
        }
      />
    </div>
  )
}

/**
 * La barre du haut de l'éditeur, la même dans les deux vues. Au bureau : retour, titre, questions,
 * les vues et l'aperçu, le direct, annuler/rétablir, l'Assistant, « … » et l'action principale ;
 * au téléphone : retour, titre, le direct, l'action principale et « … » (les vues sont sous le pouce).
 */
export function EditorHeader({
  wide,
  top,
  readOnly,
  history,
  badge,
  assist,
  showAssist,
  onAssistant,
  agentOpen,
  progress,
}: {
  wide: boolean
  top: StageTop
  readOnly?: boolean
  history?: DraftHistory
  badge?: ReactNode
  /** Les retouches de l'étape ouverte ; null : l'Assistant ouvre la conversation. */
  assist: StepAssistState | null
  showAssist: boolean
  onAssistant: () => void
  agentOpen?: boolean
  /** La position dans l'instruction (0 à 1), en barre sous l'en-tête. */
  progress?: number
}) {
  const roomy = useMediaQuery('(min-width: 1280px)')
  if (!wide) {
    return (
      <header className="glass-nav pt-safe sticky top-0 z-30 border-b">
        <div className="flex h-14 items-center gap-1 px-1.5">
          <BackLink />
          <div className="min-w-0 flex-1">
            <TitleButton top={top} readOnly={readOnly} />
          </div>
          {badge}
          {top.primary(true)}
          <InstructionMenu menu={top.menu} />
        </div>
      </header>
    )
  }
  return (
    // Au-dessus du contenu : les menus de l'en-tête s'ouvrent par-dessus l'étape.
    <header className="glass-nav relative z-20 border-b">
      <div className="flex h-16 items-center gap-1.5 px-3">
        <BackLink />
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <TitleButton top={top} readOnly={readOnly} />
          {top.questions > 0 && !readOnly && <QuestionsPill top={top} />}
        </div>
        {top.views && (
          <>
            <ViewSwitch views={top.views} compact={agentOpen || !roomy} />
            <span className="mx-1 h-7 w-px shrink-0 bg-slate-900/10 dark:bg-white/10" aria-hidden />
          </>
        )}
        {badge}
        {!readOnly && history && <UndoButtons history={history} className="shrink-0" />}
        {!readOnly && showAssist && <AssistMenu assist={assist} onAssistant={onAssistant} compact={agentOpen} />}
        <InstructionMenu menu={top.menu} />
        {top.primary(false)}
      </div>
      {progress !== undefined && (
        <div className="h-1.5 bg-slate-900/5 dark:bg-white/5">
          <div className="bg-gradient-primary h-full transition-[width] duration-500" style={{ width: `${Math.max(0, Math.min(1, progress)) * 100}%` }} />
        </div>
      )}
    </header>
  )
}
