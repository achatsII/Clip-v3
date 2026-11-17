'use client'

/**
 * Les outils et le matériel en tuiles : un grand emoji qui montre l'outil, son nom dessous
 * (`toolIcon`, `src/lib/model/tools.ts`). Au poste, en grand ; dans l'éditeur, en petit, et un
 * toucher sur une tuile en change l'image (`onChangeEmoji`).
 */
import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { TOOL_PALETTE, toolIcon } from '@/lib/model/tools'
import { cn } from '@/lib/util/cn'

export function ToolTiles({
  tools,
  size = 'lg',
  onChangeEmoji,
  words,
}: {
  tools: string[]
  size?: 'lg' | 'sm'
  /** Dans l'éditeur : l'outil (son rang dans `tools`) prend cet emoji. */
  onChangeEmoji?: (index: number, emoji: string) => void
  /** Les mots du choix d'image (éditeur seulement). */
  words?: { change: (name: string) => string }
}) {
  const [picking, setPicking] = useState<number | null>(null)
  // Une ligne vide (l'auteur tape le prochain outil) n'a pas de tuile ; le rang reste celui de `tools`.
  const items = tools.flatMap((tool, index) => (tool.trim() ? [{ index, ...toolIcon(tool) }] : []))
  if (!items.length) return null
  const lg = size === 'lg'
  const editable = !!onChangeEmoji
  const tile = cn('flex flex-col items-center justify-start gap-2 text-center', lg ? 'glass-card rounded-[28px] p-4' : 'rounded-[20px] bg-slate-900/[0.04] p-2.5 dark:bg-white/5')
  return (
    <>
      <div className={cn('grid gap-3', lg ? 'grid-cols-3 sm:grid-cols-4 lg:grid-cols-6' : 'grid-cols-3 gap-2 sm:grid-cols-4')}>
        {items.map((x) => {
          const body = (
            <>
              <span aria-hidden className={cn('leading-none', lg ? 'text-5xl' : 'text-3xl')}>
                {x.emoji}
              </span>
              <span className={cn('leading-tight font-black break-words', lg ? 'text-sm' : 'text-xs')}>{x.label}</span>
            </>
          )
          return editable ? (
            <button key={x.index} type="button" onClick={() => setPicking(x.index)} aria-label={words?.change(x.label)} title={words?.change(x.label)} className={cn('btn-press min-h-11', tile, 'hover:ring-2 hover:ring-[var(--primary)]')}>
              {body}
            </button>
          ) : (
            <div key={x.index} className={tile}>
              {body}
            </div>
          )
        })}
      </div>
      {editable && (
        <Modal open={picking !== null} onClose={() => setPicking(null)} title={picking !== null ? words?.change(toolIcon(tools[picking] ?? '').label) : undefined}>
          <div className="grid grid-cols-6 gap-2 sm:grid-cols-8">
            {TOOL_PALETTE.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => {
                  if (picking !== null) onChangeEmoji!(picking, emoji)
                  setPicking(null)
                }}
                aria-pressed={picking !== null && toolIcon(tools[picking] ?? '').emoji === emoji}
                className={cn('btn-press flex h-12 w-full items-center justify-center rounded-2xl text-3xl hover:bg-slate-900/5 dark:hover:bg-white/10', picking !== null && toolIcon(tools[picking] ?? '').emoji === emoji && 'bg-[var(--primary-soft)] ring-2 ring-[var(--primary)]')}
              >
                {emoji}
              </button>
            ))}
          </div>
        </Modal>
      )}
    </>
  )
}
