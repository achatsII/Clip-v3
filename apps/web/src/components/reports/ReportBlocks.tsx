'use client'

import { ArrowDown, ArrowRight, ArrowUp, ChevronRight, Download } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { DailyBars } from '@/components/charts/DailyBars'
import { Card } from '@/components/ui/Surface'
import { nativeEnv } from '@/lib/bridge/native'
import { getLang, useMessages } from '@/lib/i18n'
import type { Block, Kpi, Row, Tone } from '@/lib/reports/catalog'
import { cn } from '@/lib/util/cn'
import { csvDate, csvSeparator, downloadCsv, toCsv } from '@/lib/util/csv'

const toneText: Record<Tone, string> = { good: 'text-emerald-700 dark:text-emerald-300', bad: 'text-rose-600 dark:text-rose-400', neutral: 'text-slate-600 dark:text-slate-300' }
const toneChip: Record<Tone, string> = { good: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200', bad: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-200', neutral: 'bg-slate-900/5 text-slate-600 dark:bg-white/10 dark:text-slate-300' }
/** Au-delà, un tableau se replie : « Tout voir ». */
const SHOWN_ROWS = 25

/** Les blocs d'un rapport, dans l'ordre : chiffres clés, barres, tableaux, « à regarder ». */
export function ReportBlocks({ blocks, reportKey }: { blocks: Block[]; reportKey: string }) {
  return (
    <div className="space-y-5">
      {blocks.map((b) =>
        b.kind === 'kpis' ? (
          <KpiGrid key={b.id} items={b.items} />
        ) : b.kind === 'bars' ? (
          <Card key={b.id} className="p-5 sm:p-6">
            <DailyBars days={b.days} label={b.title} unit={b.unit} />
          </Card>
        ) : b.kind === 'table' ? (
          <TableBlock key={b.id} block={b} reportKey={reportKey} />
        ) : (
          <ListBlock key={b.id} block={b} />
        ),
      )}
    </div>
  )
}

function KpiGrid({ items }: { items: Kpi[] }) {
  const t = useMessages().reports
  return (
    <div className={cn('grid gap-3 sm:gap-4', items.length >= 4 ? 'grid-cols-2 xl:grid-cols-4' : 'grid-cols-2 lg:grid-cols-3')}>
      {items.map((k) => (
        <div key={k.id} className="glass-card min-w-0 rounded-[24px] p-4">
          {/* Deux lignes au plus ; au téléphone, toujours la place de deux lignes, pour que les chiffres d'une rangée s'alignent. */}
          <p className="label-caps line-clamp-2 text-slate-500 max-sm:min-h-[2lh]" title={k.label}>
            {k.label}
          </p>
          <p className="mt-1 text-3xl font-black tracking-tighter tabular-nums">{k.value}</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-bold">
            {k.delta && (
              <span className={cn('inline-flex items-center gap-0.5 rounded-lg px-1.5 py-0.5 tabular-nums', toneChip[k.delta.tone])}>
                {k.delta.text.startsWith('−') ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />}
                {k.delta.text}
              </span>
            )}
            {k.previous !== null && <span className="text-slate-400 tabular-nums">{t.previous(k.previous)}</span>}
          </div>
          {k.hint && <p className="mt-1.5 text-xs font-medium text-slate-500">{k.hint}</p>}
        </div>
      ))}
    </div>
  )
}

/** Un tableau : trier en touchant une colonne, l'exporter (un nombre reste un nombre), ouvrir une ligne. */
function TableBlock({ block, reportKey }: { block: Extract<Block, { kind: 'table' }>; reportKey: string }) {
  const t = useMessages().reports
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null)
  const [all, setAll] = useState(false)
  const rows = sort ? [...block.rows].sort((a, b) => compare(a, b, sort.key) * sort.dir) : block.rows
  const shown = all ? rows : rows.slice(0, SHOWN_ROWS)
  const anyLow = block.rows.some((r) => Object.values(r.cells).some((c) => c.low))
  const first = block.columns[0]?.key

  function exportCsv() {
    const sep = csvSeparator(getLang())
    const head = block.columns.map((c) => c.label)
    const body = rows.map((r) => block.columns.map((c) => (c.numeric && typeof r.cells[c.key]?.sort === 'number' ? r.cells[c.key]!.sort : (r.cells[c.key]?.text ?? ''))))
    downloadCsv(t.exportFile(`${reportKey}-${block.id}`, csvDate(new Date().toISOString(), false)), toCsv([head, ...body], sep))
  }

  return (
    <Card className="p-4 sm:p-6">
      <div className="mb-3 flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-black tracking-tight">{block.title}</h2>
          {block.hint && <p className="text-sm font-medium text-slate-500">{block.hint}</p>}
        </div>
        {!!block.rows.length && !nativeEnv() && (
          <button type="button" onClick={exportCsv} aria-label={`${t.export} · ${block.title}`} title={t.export} className="btn-press glass-card flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-slate-600 dark:text-slate-300">
            <Download className="h-4 w-4" />
          </button>
        )}
      </div>
      {!block.rows.length ? (
        <p className="rounded-2xl bg-slate-900/[0.03] p-4 text-sm font-bold text-slate-500 dark:bg-white/5">{t.emptyTable}</p>
      ) : (
        <>
          <div className="-mx-4 overflow-x-auto px-4 sm:-mx-6 sm:px-6">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="text-left">
                  {block.columns.map((c) => (
                    <th key={c.key} scope="col" className={cn('px-3 pb-2 font-black first:pl-0 last:pr-0', c.numeric && 'text-right')}>
                      <button
                        type="button"
                        onClick={() => setSort((s) => (s?.key === c.key ? { key: c.key, dir: s.dir === 1 ? -1 : 1 } : { key: c.key, dir: c.numeric ? -1 : 1 }))}
                        className={cn('label-caps inline-flex min-h-9 items-center gap-1 text-slate-500 hover:text-slate-900 dark:hover:text-white', c.numeric && 'flex-row-reverse')}
                      >
                        {c.label}
                        {sort?.key === c.key && (sort.dir === 1 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => (
                  <tr key={r.id} className="border-t border-slate-900/5 dark:border-white/5">
                    {block.columns.map((c) => {
                      const cell = r.cells[c.key]
                      const text = cell ? `${cell.text}${cell.low ? ' *' : ''}` : ''
                      return (
                        <td key={c.key} className={cn('px-3 py-2.5 align-top font-bold first:pl-0 last:pr-0', c.numeric && 'text-right tabular-nums', cell?.tone && toneText[cell.tone], cell?.low && 'text-slate-400', c.key === first ? 'max-w-[18rem]' : 'whitespace-nowrap')}>
                          {c.key === first && r.href ? (
                            <Link href={r.href} className="inline-flex items-start gap-1 font-black text-slate-900 hover:text-[var(--primary)] dark:text-white">
                              <span className="line-clamp-2">{text}</span>
                              <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 opacity-40" />
                            </Link>
                          ) : (
                            <span className={cn(c.key === first && 'line-clamp-2 font-black text-slate-900 dark:text-white')}>{text}</span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-slate-500">
            <span>{anyLow ? `* ${t.lowSampleHint}` : ''}</span>
            <span className="flex items-center gap-3">
              {rows.length > SHOWN_ROWS && (
                <button type="button" onClick={() => setAll((v) => !v)} className="btn-press h-9 rounded-xl px-2 font-black text-[var(--primary)]">
                  {all ? `− ${SHOWN_ROWS}` : `+ ${rows.length - SHOWN_ROWS}`}
                </button>
              )}
              {block.link && (
                <Link href={block.link.href} className="inline-flex h-9 items-center gap-1 font-black text-[var(--primary)]">
                  {block.link.label} <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              )}
            </span>
          </div>
        </>
      )}
    </Card>
  )
}

function compare(a: Row, b: Row, key: string): number {
  const x = a.cells[key]?.sort ?? null
  const y = b.cells[key]?.sort ?? null
  if (x === y) return 0
  if (x === null) return 1
  if (y === null) return -1
  return typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y))
}

function ListBlock({ block }: { block: Extract<Block, { kind: 'list' }> }) {
  return (
    <Card className="p-4 sm:p-6">
      <h2 className="mb-3 text-lg font-black tracking-tight">{block.title}</h2>
      {block.items.length ? (
        <ul className="space-y-2">
          {block.items.map((i) => {
            const inner = (
              <>
                <span className={cn('mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full', i.tone === 'bad' ? 'bg-rose-500' : i.tone === 'good' ? 'bg-emerald-500' : 'bg-slate-400')} />
                <span className="min-w-0 flex-1 font-bold">{i.text}</span>
                {i.href && <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />}
              </>
            )
            return (
              <li key={i.text}>
                {i.href ? (
                  <Link href={i.href} className="btn-press flex items-start gap-3 rounded-2xl p-2 hover:bg-slate-900/5 dark:hover:bg-white/5">
                    {inner}
                  </Link>
                ) : (
                  <span className="flex items-start gap-3 p-2">{inner}</span>
                )}
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="rounded-2xl bg-emerald-50 p-4 text-sm font-bold text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200">{block.empty}</p>
      )}
    </Card>
  )
}
