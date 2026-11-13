'use client'

/**
 * Le texte d'une réponse du conseiller, en markdown court : paragraphes, listes à puces ou numérotées,
 * **gras** et *italique*. Rendu en éléments React (jamais de HTML injecté) : ce que l'IA écrit ne peut
 * pas devenir du code dans la page.
 */
import { Fragment, type ReactNode } from 'react'
import { cn } from '@/lib/util/cn'

/**
 * La typographie : une espace insécable dans les guillemets et devant « : ; ? ! » (rien ne se coupe là),
 * et l'apostrophe courbe, comme dans les textes de l'interface (la base de connaissances écrit l'apostrophe droite).
 */
const nbsp = (s: string) =>
  s
    .replace(/« /g, '«\u00a0') // i18n-ignore : de la typographie, pas un texte
    .replace(/ »/g, '\u00a0»') // i18n-ignore : de la typographie, pas un texte
    .replace(/ ([:;?!])/g, '\u00a0$1')
    .replace(/(\p{L})'(?=\p{L})/gu, '$1\u2019')

function inline(raw: string, key: string): ReactNode[] {
  const text = nbsp(raw)
  const out: ReactNode[] = []
  const re = /\*\*([^*]+)\*\*|\*([^*\n]+)\*/g
  let last = 0
  let m: RegExpExecArray | null
  let i = 0
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index))
    out.push(m[1] !== undefined ? <strong key={`${key}-b${i++}`} className="font-black">{m[1]}</strong> : <em key={`${key}-i${i++}`}>{m[2]}</em>)
    last = m.index + m[0].length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

type Block = { kind: 'p'; lines: string[] } | { kind: 'ul' | 'ol'; items: string[] }

function blocksOf(text: string): Block[] {
  const blocks: Block[] = []
  for (const raw of text.replace(/\r/g, '').split('\n')) {
    const line = raw.trimEnd()
    const bullet = /^\s*[-*•]\s+(.*)$/.exec(line)
    const numbered = /^\s*\d+[.)]\s+(.*)$/.exec(line)
    const last = blocks[blocks.length - 1]
    if (bullet || numbered) {
      const kind = bullet ? 'ul' : 'ol'
      const item = (bullet ?? numbered)![1]
      if (last && last.kind === kind) last.items.push(item)
      else blocks.push({ kind, items: [item] })
    } else if (!line.trim()) {
      blocks.push({ kind: 'p', lines: [] })
    } else if (last && last.kind === 'p') last.lines.push(line.trim())
    else blocks.push({ kind: 'p', lines: [line.trim()] })
  }
  return blocks.filter((b) => (b.kind === 'p' ? b.lines.length > 0 : b.items.length > 0))
}

export function RichText({ text, className }: { text: string; className?: string }) {
  return (
    <div className={cn('space-y-2 text-[14.5px] leading-relaxed font-medium', className)}>
      {blocksOf(text).map((b, i) =>
        b.kind === 'p' ? (
          <p key={i}>
            {b.lines.map((l, j) => (
              <Fragment key={j}>
                {j > 0 && <br />}
                {inline(l, `${i}-${j}`)}
              </Fragment>
            ))}
          </p>
        ) : b.kind === 'ul' ? (
          <ul key={i} className="list-disc space-y-1 pl-5">
            {b.items.map((it, j) => (
              <li key={j}>{inline(it, `${i}-${j}`)}</li>
            ))}
          </ul>
        ) : (
          <ol key={i} className="list-decimal space-y-1 pl-5">
            {b.items.map((it, j) => (
              <li key={j}>{inline(it, `${i}-${j}`)}</li>
            ))}
          </ol>
        ),
      )}
    </div>
  )
}
