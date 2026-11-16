'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Award, Check, CircleDashed, Clock, Download, GraduationCap, Hourglass, Printer, RotateCcw, UserPlus, X } from 'lucide-react'
import Link from 'next/link'
import { useMemo, useState, type ReactNode } from 'react'
import { useSession } from '@/components/providers/Session'
import { Button } from '@/components/ui/Button'
import { useConfirm } from '@/components/ui/Confirm'
import { Input, Label, Segmented, Select } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { EmptyState, errorText, ErrorState, SkeletonRows } from '@/components/ui/States'
import { useToast } from '@/components/ui/Toast'
import { useStationCounts, useStationInstructions, useStations, useTrainingCatalog } from '@/hooks/queries'
import { nativeEnv } from '@/lib/bridge/native'
import { useEntitlement, useGate } from '@/lib/billing/state'
import type { Doc } from '@/lib/gateway/data'
import { getLang, useMessages } from '@/lib/i18n'
import { coverage, dueQualifications, latestQualifications, listQualifications, QUALIFICATIONS_KEY, registerCsv, revalidateMonths, REVALIDATE_CHOICES, signOff, standingOf, type CoverageCell, type Level, type ShiftKey, type Standing } from '@/lib/model/academy'
import { coveredStations } from '@/lib/model/search'
import { ASSIGNMENTS_KEY, assignmentOf, assignTraining, defaultDue, latestAssignments, listAssignments, removeAssignment, requiredOf, todoList, type TodoItem } from '@/lib/model/assignments'
import { buildMatrix, listTrainings } from '@/lib/model/training'
import type { Assignment, Operator, QualificationLevel } from '@/lib/model/types'
import { cn, formatDate } from '@/lib/util/cn'
import { csvDate, csvSeparator, downloadCsv } from '@/lib/util/csv'
import { AcademyGuide } from './AcademyGuide'
import { AcademyPaths, type PathRow } from './AcademyPaths'
import { AcademyTodo, dayLabel } from './AcademyTodo'
import { AssignDialog } from './AssignDialog'
import { TRAININGS_KEY } from './SkillsMatrix'

/** L'apparence de chaque niveau : une couleur, et toujours une icône ou un compte (jamais la couleur seule). */
const LOOK: Record<Level, string> = {
  trainer: 'bg-emerald-700 text-white',
  qualified: 'bg-emerald-500 text-white',
  expired: 'bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-200',
  learning: 'bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-100',
  none: 'border-2 border-dashed border-slate-300 text-slate-400 dark:border-slate-600 dark:text-slate-500',
}

function LevelMark({ s, small }: { s: Standing; small?: boolean }) {
  const icon = small ? 'h-4 w-4' : 'h-5 w-5'
  if (s.level === 'trainer') return <Award className={icon} strokeWidth={2.5} />
  if (s.level === 'qualified') return <Check className={icon} strokeWidth={3} />
  if (s.level === 'expired') return <RotateCcw className={icon} strokeWidth={2.5} />
  if (s.level === 'learning') return s.required ? <span className={cn('font-black tabular-nums', small ? 'text-[10px]' : 'text-xs')}>{`${s.done}/${s.required}`}</span> : <Hourglass className={icon} />
  return <CircleDashed className={icon} />
}

const TONES: Record<CoverageCell['tone'], string> = {
  none: 'bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-200',
  fragile: 'bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-100',
  ok: 'bg-emerald-500 text-white',
}

/**
 * L'Académie, dans Équipe › Compétences : qui est qualifié à quel poste (validé sur le terrain), qui
 * est à revalider, et la couverture de chaque poste, quart par quart. Le parcours d'un poste, ce sont
 * ses instructions publiées ; leurs questions se valident au poste, comme sans le module.
 */
export function Academy({ operators, query }: { operators: Array<Doc<Operator>>; query: (o: Doc<Operator>) => boolean }) {
  const t = useMessages().academy
  const tt = useMessages().training
  const { data, org, can, updateOrg } = useSession()
  const toast = useToast()
  const stations = useStations()
  const catalog = useTrainingCatalog()
  const trainings = useQuery({ queryKey: TRAININGS_KEY, queryFn: () => listTrainings(data) })
  const quals = useQuery({ queryKey: QUALIFICATIONS_KEY, queryFn: () => listQualifications(data) })
  const covered = useQuery({ queryKey: ['instructions', 'covered-stations'], queryFn: () => coveredStations(data) })
  const assignments = useQuery({ queryKey: ASSIGNMENTS_KEY, queryFn: () => listAssignments(data) })
  const counts = useStationCounts()
  // « À faire » d'abord : qui former, la plus pressée en tête.
  const [view, setView] = useState<'todo' | 'matrix' | 'paths' | 'coverage'>('todo')
  const [assigning, setAssigning] = useState(false)
  const [open, setOpen] = useState<{ op: Doc<Operator>; station: { id: string; name: string } } | null>(null)
  const [person, setPerson] = useState<Doc<Operator> | null>(null)
  const [cover, setCover] = useState<{ station: string; shift: ShiftKey; cell: CoverageCell } | null>(null)
  // « N à revalider » se touche : la matrice ne garde que ces personnes.
  const [onlyDue, setOnlyDue] = useState(false)
  const [now] = useState(() => Date.now())
  const active = useMemo(() => operators.filter((o) => o.json_data.active !== false), [operators])

  const model = useMemo(() => {
    if (!stations.data || !catalog.data || !trainings.data || !quals.data || !covered.data || !assignments.data) return null
    const matrix = buildMatrix(active, stations.data, catalog.data, trainings.data)
    const latest = latestQualifications(quals.data)
    const assigned = latestAssignments(assignments.data)
    const signedAt = new Set(quals.data.map((q) => q.json_data.stationId))
    // Les postes qui ont un parcours (une instruction publiée), ou déjà une validation.
    const cols = stations.data.filter((s) => covered.data.has(s._id) || signedAt.has(s._id)).map((s) => ({ id: s._id, name: s.json_data.name }))
    const standing = (op: string, st: string) => standingOf(matrix.cells[op]?.[st], latest.get(`${op}:${st}`), now)
    const todo = todoList(active, cols, assigned, standing, now)
    // Les questions de chaque poste : les instructions publiées qui en ont, par poste (choisi ou par règle).
    const withQuestions = new Map<string, number>()
    for (const d of catalog.data) for (const st of new Set([...d.json_data.stationIds, ...(d.json_data.ruleStationIds ?? [])])) withQuestions.set(st, (withQuestions.get(st) ?? 0) + 1)
    const learners = new Map<string, number>()
    for (const it of todo) learners.set(it.station.id, (learners.get(it.station.id) ?? 0) + 1)
    return { latest, assigned, cols, standing, todo, withQuestions, learners, due: dueQualifications(latest, active, now) }
  }, [stations.data, catalog.data, trainings.data, quals.data, covered.data, assignments.data, active, now])

  const failed = [stations, catalog, trainings, quals, covered, assignments].find((q) => q.error)
  if (failed) return <ErrorState error={failed.error} onRetry={() => void Promise.all([stations.refetch(), catalog.refetch(), trainings.refetch(), quals.refetch(), covered.refetch(), assignments.refetch()])} />
  if (!model) return <SkeletonRows />
  if (!model.cols.length) return <EmptyState icon={<GraduationCap className="h-7 w-7" />} title={t.empty} description={t.emptyHint} />

  const dueIds = new Set(model.due.map((d) => d.operatorId))
  const rows = active.filter(query).filter((o) => !onlyDue || dueIds.has(o._id))
  const months = revalidateMonths(org.json_data)
  const cov = coverage(active, model.cols.map((c) => c.id), model.standing)
  const canSign = can('approve', 'write')
  const todo = model.todo.filter((it) => query(it.operator))
  const pathRows: PathRow[] = model.cols.map((c) => ({ id: c.id, name: c.name, total: counts.data?.get(c.id) ?? 0, withQuestions: model.withQuestions.get(c.id) ?? 0, learners: model.learners.get(c.id) ?? 0 }))
  const assignButton = canSign ? (
    <Button variant="primary" icon={<UserPlus className="h-4 w-4" />} onClick={() => setAssigning(true)}>
      {t.assign.open}
    </Button>
  ) : null

  function downloadRegister() {
    const levels: Record<QualificationLevel, string> = t.signatures
    const csv = registerCsv(quals.data ?? [], [...t.registerHead], (l) => levels[l], (d) => csvDate(d, false), csvSeparator(getLang()))
    downloadCsv(t.registerFile(csvDate(new Date().toISOString(), false)), csv)
  }

  return (
    <div className="space-y-3">
      <AcademyGuide withQuestions={catalog.data?.length ?? 0} toTrain={model.todo.length} signed={quals.data?.length ?? 0} onPaths={() => setView('paths')} />
      <div className="flex flex-wrap items-center gap-2">
        {/* Quatre vues : au téléphone, la rangée défile au lieu de pousser la page de côté. */}
        <div className="no-scrollbar max-w-full min-w-0 overflow-x-auto">
          <Segmented
            size="sm"
            value={view}
            onChange={setView}
            options={[
              { value: 'todo', label: `${t.views.todo}${model.todo.length ? ` · ${model.todo.length}` : ''}` },
              { value: 'matrix', label: t.views.matrix },
              { value: 'paths', label: t.views.paths },
              { value: 'coverage', label: t.views.coverage },
            ]}
          />
        </div>
        {assignButton}
        {view === 'matrix' && (
        <button
          type="button"
          aria-pressed={onlyDue}
          disabled={!model.due.length}
          onClick={() => setOnlyDue((v) => !v)}
          title={model.due.length ? t.onlyDue : undefined}
          className={cn('btn-press flex min-h-11 items-center gap-2 rounded-2xl px-4 text-sm font-black disabled:cursor-default', model.due.length ? 'bg-orange-50 text-orange-900 dark:bg-orange-500/15 dark:text-orange-100' : 'bg-emerald-50 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200', onlyDue && 'ring-2 ring-orange-400')}
        >
          {model.due.length ? <RotateCcw className="h-4 w-4" /> : <Check className="h-4 w-4" />} {t.dueCount(model.due.length)}
          {onlyDue && <X className="h-4 w-4" aria-hidden />}
        </button>
        )}
        <span className="flex-1" />
        {/* Les outils d'administration restent à l'ordinateur : au téléphone, la matrice d'abord. */}
        {can('settings', 'write') && (
          <label className="flex items-center gap-2 text-sm font-black text-slate-600 max-sm:hidden dark:text-slate-300">
            {t.revalidateEvery}
            <Select
              value={String(months)}
              aria-label={t.revalidateEvery}
              className="h-11 w-auto py-0"
              onChange={(e) => {
                void updateOrg({ academy: { revalidateMonths: Number(e.target.value) } })
                  .then(() => toast.success(t.revalidateSaved, t.revalidateHint))
                  .catch((err: unknown) => toast.error(errorText(err)))
              }}
            >
              {REVALIDATE_CHOICES.map((m) => (
                <option key={m} value={m}>
                  {t.every(m)}
                </option>
              ))}
            </Select>
          </label>
        )}
        {!nativeEnv() && (
          <Button size="sm" className="max-sm:hidden" icon={<Download className="h-4 w-4" />} onClick={downloadRegister} disabled={!quals.data?.length} title={quals.data?.length ? undefined : t.registerEmpty}>
            {t.register}
          </Button>
        )}
      </div>

      {view === 'todo' && <AcademyTodo items={todo} onOpen={(it: TodoItem) => setOpen({ op: it.operator, station: it.station })} action={assignButton} />}
      {view === 'paths' && <AcademyPaths rows={pathRows} />}
      {(view === 'matrix' || view === 'coverage') && (
      <>
      <Surface>
        <table className="w-full border-separate border-spacing-0">
          <thead>
            <tr>
              <th scope="col" className="label-caps sticky left-0 z-10 bg-white px-3 py-3 text-left text-slate-500 sm:px-4 dark:bg-[#151e2e]">
                {view === 'matrix' ? tt.people : ''}
              </th>
              {view === 'matrix'
                ? model.cols.map((s) => (
                    <th key={s.id} scope="col" className="min-w-[4.5rem] px-1.5 py-3 text-center align-bottom text-xs font-black text-slate-700 sm:min-w-20 sm:px-2 dark:text-slate-200">
                      <span className="line-clamp-2 break-words">{s.name}</span>
                    </th>
                  ))
                : cov.shifts.map((sh) => (
                    <th key={sh} scope="col" className="min-w-20 px-1.5 py-3 text-center text-xs font-black text-slate-700 sm:px-2 dark:text-slate-200">
                      {t.shifts[sh]}
                    </th>
                  ))}
            </tr>
          </thead>
          <tbody>
            {view === 'matrix'
              ? rows.map((op) => (
                  <tr key={op._id}>
                    <th scope="row" className="sticky left-0 z-10 max-w-32 border-t border-slate-900/5 bg-white px-1.5 py-2 text-left sm:max-w-44 sm:px-2 dark:border-white/5 dark:bg-[#151e2e]">
                      <button type="button" onClick={() => setPerson(op)} title={op.json_data.name} className="btn-press block w-full truncate rounded-xl px-1.5 py-2 text-left text-sm font-black text-slate-900 hover:bg-slate-900/5 sm:px-2 dark:text-white dark:hover:bg-white/10">
                        {op.json_data.name}
                      </button>
                    </th>
                    {model.cols.map((s) => {
                      const st = model.standing(op._id, s.id)
                      // Rien d'attendu ici (ni poste habituel, ni formation demandée, ni rien de commencé) : une case discrète.
                      const quiet = st.level === 'none' && !requiredOf(op, s.id, model.assigned)
                      const label = t.cellLabel(op.json_data.name, s.name, quiet ? t.notRequired : t.levels[st.level])
                      return (
                        <td key={s.id} className="border-t border-slate-900/5 px-1.5 py-2 text-center sm:px-2 dark:border-white/5">
                          <button type="button" onClick={() => setOpen({ op, station: s })} aria-label={label} title={label} className={cn('btn-press relative mx-auto flex h-11 w-11 items-center justify-center rounded-2xl', quiet ? 'text-slate-300 hover:bg-slate-900/5 dark:text-slate-600 dark:hover:bg-white/5' : LOOK[st.level])}>
                            {quiet ? <span className="h-1.5 w-1.5 rounded-full bg-current" /> : <LevelMark s={st} />}
                            {(st.dueSoon || (st.retrain && (st.level === 'qualified' || st.level === 'trainer'))) && (
                              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-white ring-2 ring-white dark:ring-[#151e2e]">
                                <Clock className="h-3 w-3" strokeWidth={3} />
                              </span>
                            )}
                          </button>
                        </td>
                      )
                    })}
                  </tr>
                ))
              : model.cols.map((s) => (
                  <tr key={s.id}>
                    <th scope="row" title={s.name} className="sticky left-0 z-10 max-w-36 truncate border-t border-slate-900/5 bg-white px-3 py-2 text-left text-sm font-black text-slate-900 sm:max-w-52 sm:px-4 dark:border-white/5 dark:bg-[#151e2e] dark:text-white">
                      {s.name}
                    </th>
                    {cov.shifts.map((sh) => {
                      const cell = cov.cells[s.id][sh]!
                      return (
                        <td key={sh} className="border-t border-slate-900/5 px-1.5 py-2 text-center sm:px-2 dark:border-white/5">
                          <button type="button" onClick={() => setCover({ station: s.name, shift: sh, cell })} aria-label={`${s.name}, ${t.shifts[sh]} : ${t.tones[cell.tone]}`} className={cn('btn-press mx-auto flex h-11 min-w-11 items-center justify-center gap-1 rounded-2xl px-3 text-sm font-black tabular-nums', TONES[cell.tone])}>
                            {cell.people.length}
                          </button>
                        </td>
                      )
                    })}
                  </tr>
                ))}
          </tbody>
        </table>
      </Surface>

      {view === 'matrix' ? (
        <ul className="flex flex-wrap gap-x-4 gap-y-2 px-1" aria-label={t.views.matrix}>
          {(['trainer', 'qualified', 'expired', 'learning', 'none'] as const).map((k) => (
            <li key={k} className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
              <span className={cn('flex h-6 w-6 items-center justify-center rounded-lg', LOOK[k])}>
                <LevelMark small s={{ level: k, current: null, dueSoon: false, done: 1, required: 2, retrain: false }} />
              </span>
              {t.levels[k]}
            </li>
          ))}
          <li className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-500 text-white">
              <Clock className="h-3.5 w-3.5" strokeWidth={3} />
            </span>
            {t.dueSoonLegend}
          </li>
          <li className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
            <span className="flex h-6 w-6 items-center justify-center text-slate-300 dark:text-slate-600">
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
            </span>
            {t.notRequired}
          </li>
        </ul>
      ) : (
        <>
          <ul className="flex flex-wrap gap-x-4 gap-y-2 px-1" aria-label={t.views.coverage}>
            {(['none', 'fragile', 'ok'] as const).map((k) => (
              <li key={k} className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
                <span className={cn('h-4 w-6 rounded-md', TONES[k])} /> {t.tones[k]}
              </li>
            ))}
          </ul>
          <p className="px-1 text-xs font-bold text-slate-400">{t.coverageHint}</p>
        </>
      )}
      </>
      )}

      {open && (
        <CellDialog
          op={open.op}
          station={open.station}
          standing={model.standing(open.op._id, open.station.id)}
          months={months}
          assignment={assignmentOf(model.assigned, open.op._id, open.station.id) ?? null}
          usual={requiredOf(open.op, open.station.id, new Map()) === 'usual'}
          onClose={() => setOpen(null)}
        />
      )}
      <AssignDialog open={assigning} onClose={() => setAssigning(false)} stations={model.cols} operators={active} standing={model.standing} />
      {person && <PersonDialog op={person} cols={model.cols} standing={model.standing} onClose={() => setPerson(null)} />}
      <Modal open={!!cover} onClose={() => setCover(null)} title={cover ? t.coverTitle(cover.station, t.shifts[cover.shift]) : undefined}>
        {cover && !cover.cell.people.length ? (
          <p className="font-bold text-slate-500">{t.nobody}</p>
        ) : (
          <ul className="space-y-2">
            {cover?.cell.people.map((p) => (
              <li key={p.id} className="glass-card flex items-center gap-3 rounded-2xl p-3">
                <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', LOOK[p.level])}>{p.level === 'trainer' ? <Award className="h-4 w-4" /> : <Check className="h-4 w-4" strokeWidth={3} />}</span>
                <span className="min-w-0 flex-1 truncate font-black">{p.name}</span>
                <span className="text-xs font-black text-slate-500 uppercase">{t.levels[p.level]}</span>
              </li>
            ))}
          </ul>
        )}
      </Modal>
    </div>
  )
}

/** Une surface pleine : la colonne des noms, collée à gauche, garde le même fond que le tableau. */
function Surface({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-[28px] border border-white/80 bg-white shadow-[0_10px_40px_-10px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-[#151e2e]">
      <div className="overflow-x-auto">{children}</div>
    </div>
  )
}

/** Une personne à un poste : où elle en est, le parcours du poste, et la validation sur le terrain. */
function CellDialog({ op, station, standing, months, assignment, usual, onClose }: { op: Doc<Operator>; station: { id: string; name: string }; standing: Standing; months: number; assignment: Assignment | null; usual: boolean; onClose: () => void }) {
  const t = useMessages().academy
  const tt = useMessages().training
  const { data, can, profile, displayName } = useSession()
  const qc = useQueryClient()
  const toast = useToast()
  const confirm = useConfirm()
  const path = useStationInstructions(station.id)
  const trainings = useQuery({ queryKey: TRAININGS_KEY, queryFn: () => listTrainings(data) })
  const [level, setLevel] = useState<'qualified' | 'trainer'>(standing.level === 'trainer' ? 'trainer' : 'qualified')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [due, setDue] = useState(() => assignment?.due ?? defaultDue())
  const canSign = can('approve', 'write')
  const q = standing.current
  const qualified = standing.level === 'qualified' || standing.level === 'trainer'

  /** Mettre à former à ce poste (ou changer l'échéance), ou retirer de « À faire ». */
  async function setAssigned(on: boolean) {
    setBusy(true)
    try {
      const by = { id: profile.userId, name: displayName }
      if (on) await assignTraining(data, [{ id: op._id, name: op.json_data.name }], station, due || null, by)
      else if (assignment) await removeAssignment(data, assignment, by)
      await qc.invalidateQueries({ queryKey: ASSIGNMENTS_KEY })
      toast.success(on ? t.cell.assignedToast : t.cell.removedToast)
    } catch (e) {
      toast.error(t.assign.failed, errorText(e))
    } finally {
      setBusy(false)
    }
  }

  // Ce que la personne a validé de chaque instruction du poste (la meilleure version validée).
  const best = useMemo(() => {
    const m = new Map<string, number>()
    for (const d of trainings.data ?? []) if (d.json_data.passed && d.json_data.operatorId === op._id) m.set(d.json_data.instructionId, Math.max(m.get(d.json_data.instructionId) ?? 0, d.json_data.version ?? 0))
    return m
  }, [trainings.data, op._id])
  const published = (path.data ?? []).filter((d) => (d.json_data.publishedVersion ?? 0) > 0)

  async function sign(as: QualificationLevel) {
    setBusy(true)
    try {
      await signOff(data, { operatorId: op._id, operatorName: op.json_data.name, stationId: station.id, stationName: station.name, level: as, trainingsDone: standing.done, trainingsRequired: standing.required, note: note.trim() || null, byId: profile.userId, byName: displayName }, months)
      await qc.invalidateQueries({ queryKey: QUALIFICATIONS_KEY })
      toast.success(as === 'none' ? t.revoked : t.signed)
      onClose()
    } catch (e) {
      toast.error(t.signFailed, errorText(e))
    } finally {
      setBusy(false)
    }
  }

  const status =
    q && (standing.level === 'qualified' || standing.level === 'trainer' || standing.level === 'expired')
      ? [t.signedBy(q.byName, formatDate(q.at)), ...(standing.dueSoon ? [] : [q.validUntil ? (standing.level === 'expired' ? t.expiredOn(formatDate(q.validUntil)) : t.validUntil(formatDate(q.validUntil))) : t.noExpiry])]
      : []

  return (
    <Modal open onClose={onClose} title={tt.cellTitle(op.json_data.name, station.name)}>
      <div className="space-y-5">
        <div className="flex items-start gap-3">
          <span className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl', LOOK[standing.level])}>
            <LevelMark s={standing} />
          </span>
          <div className="min-w-0 flex-1">
            {/* Le focus va au titre : pas de clavier qui surgit au téléphone. */}
            <p data-autofocus tabIndex={-1} className="text-lg font-black tracking-tight outline-none">
              {t.levels[standing.level]}
            </p>
            {status.map((line) => (
              <p key={line} className="text-sm font-bold text-slate-500">
                {line}
              </p>
            ))}
            {standing.dueSoon && q?.validUntil && <p className="text-sm font-black text-orange-700 dark:text-orange-300">{t.dueSoon(formatDate(q.validUntil))}</p>}
            {standing.retrain && <p className="text-sm font-black text-orange-700 dark:text-orange-300">{t.retrain}</p>}
          </div>
        </div>

        {canSign && !qualified && (
          <section className="rounded-[24px] bg-slate-900/[0.03] p-4 dark:bg-white/5">
            {assignment ? (
              <div className="flex flex-wrap items-center gap-2">
                <p className="flex-1 font-black">{t.cell.assigned(assignment.due ? dayLabel(assignment.due) : null)}</p>
                <button type="button" disabled={busy} onClick={() => void setAssigned(false)} className="btn-press h-11 rounded-2xl px-3 text-sm font-black text-slate-600 hover:bg-slate-900/5 dark:text-slate-300 dark:hover:bg-white/10">
                  {t.cell.unassign}
                </button>
              </div>
            ) : usual ? (
              <p className="font-bold text-slate-600 dark:text-slate-300">{t.cell.usual}</p>
            ) : (
              <div className="flex flex-wrap items-end gap-2">
                <div>
                  <Label htmlFor="cell-due">{t.assign.due}</Label>
                  <Input id="cell-due" type="date" value={due} onChange={(e) => setDue(e.target.value)} className="w-auto" />
                </div>
                <Button loading={busy} icon={<UserPlus className="h-4 w-4" />} onClick={() => void setAssigned(true)}>
                  {t.cell.assign}
                </Button>
              </div>
            )}
          </section>
        )}

        <section>
          <p className="label-caps text-slate-500">{t.path}</p>
          <p className="mb-2 text-xs font-bold text-slate-400">{t.pathHint}</p>
          {path.isLoading ? (
            <SkeletonRows count={2} />
          ) : !published.length ? (
            <p className="text-sm font-bold text-slate-500">{t.noPath}</p>
          ) : (
            <ul className="space-y-2">
              {published.map((d) => {
                const i = d.json_data
                const hasQuiz = (i.publishedQuiz ?? 0) > 0
                const v = best.get(d._id)
                const state = !hasQuiz ? 'none' : v === undefined ? 'missing' : v >= (i.trainingVersion ?? 0) ? 'done' : 'outdated'
                return (
                  <li key={d._id} className="glass-card flex items-center gap-3 rounded-2xl p-3">
                    <Link href={`/instructions/${d._id}`} className="min-w-0 flex-1 text-[15px] leading-snug font-black hover:underline" title={tt.open}>
                      {i.title}
                    </Link>
                    <span className={cn('flex shrink-0 items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-black', state === 'done' ? LOOK.qualified : state === 'outdated' ? LOOK.expired : 'bg-slate-900/5 text-slate-600 dark:bg-white/10 dark:text-slate-300')}>
                      {state === 'done' ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : state === 'outdated' ? <RotateCcw className="h-3.5 w-3.5" /> : state === 'missing' ? <CircleDashed className="h-3.5 w-3.5" /> : null}
                      {state === 'none' ? t.withoutQuestions : tt.states[state]}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
          {!!standing.required && <p className="mt-2 text-xs font-bold text-slate-500">{t.questions(standing.done, standing.required)}</p>}
        </section>

        {canSign && (
          <section className="rounded-[24px] bg-emerald-50 p-4 dark:bg-emerald-500/10">
            <p className="font-black">{t.signTitle}</p>
            <p className="mb-3 text-sm font-bold text-slate-600 dark:text-slate-300">{t.signHint}</p>
            <Segmented
              value={level}
              onChange={setLevel}
              options={[
                { value: 'qualified', label: t.asQualified },
                { value: 'trainer', label: t.asTrainer },
              ]}
            />
            <div className="mt-3">
              <Label htmlFor="academy-note">{t.note}</Label>
              <Input id="academy-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder={t.notePlaceholder} />
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button variant="primary" loading={busy} icon={<Check className="h-4 w-4" strokeWidth={3} />} onClick={() => void sign(level)}>
                {q ? t.revalidate : t.sign}
              </Button>
              {q && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={async () => {
                    if (await confirm({ title: t.revokeConfirm.title, description: t.revokeConfirm.description, confirmLabel: t.revokeConfirm.confirm, danger: true })) void sign('none')
                  }}
                  className="btn-press h-11 rounded-2xl px-3 text-sm font-black text-rose-600"
                >
                  {t.revoke}
                </button>
              )}
            </div>
          </section>
        )}
      </div>
    </Modal>
  )
}

/** Une personne : ses qualifications en cours, et son attestation à imprimer. */
function PersonDialog({ op, cols, standing, onClose }: { op: Doc<Operator>; cols: Array<{ id: string; name: string }>; standing: (op: string, st: string) => Standing; onClose: () => void }) {
  const t = useMessages().academy
  const mine = cols.map((c) => ({ c, s: standing(op._id, c.id) })).filter(({ s }) => s.current)
  const qualified = mine.filter(({ s }) => s.level === 'qualified' || s.level === 'trainer').length
  return (
    <Modal open onClose={onClose} title={t.personTitle(op.json_data.name)}>
      <p className="mb-3 font-bold text-slate-500">{t.qualifiedAt(qualified)}</p>
      {!!mine.length && (
        <ul className="mb-5 space-y-2">
          {mine.map(({ c, s }) => (
            <li key={c.id} className="glass-card flex items-center gap-3 rounded-2xl p-3">
              <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', LOOK[s.level])}>
                <LevelMark small s={s} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-black">{c.name}</span>
                <span className="block text-xs font-bold text-slate-500">
                  {t.levels[s.level]}
                  {s.current?.validUntil ? ` · ${(s.level === 'expired' ? t.expiredOn : t.validUntil)(formatDate(s.current.validUntil))}` : ''}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
      <Link href={`/equipe/attestation/${op._id}`} className="btn-press glass-card flex h-12 items-center justify-center gap-2 rounded-full text-sm font-black">
        <Printer className="h-4 w-4" /> {t.attestation}
      </Link>
    </Modal>
  )
}

/** Sans le module : la matrice simple reste, et l'Académie se propose en une carte (14 jours offerts). */
export function AcademyTeaser() {
  const t = useMessages().academy.teaser
  const ent = useEntitlement('academy')
  const gate = useGate()
  return (
    <section className="glass-panel flex flex-col gap-4 rounded-[28px] p-5 sm:flex-row sm:items-center">
      <span className="bg-gradient-accent shadow-accent flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white">
        <GraduationCap className="h-6 w-6" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-black tracking-tight">{t.title}</p>
        <p className="text-sm font-bold text-slate-500 dark:text-slate-400">{t.text}</p>
      </div>
      <Button className="self-end sm:self-auto" onClick={() => gate(ent, 'academy', () => undefined)}>
        {t.cta}
      </Button>
    </section>
  )
}
