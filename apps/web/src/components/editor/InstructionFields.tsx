'use client'

import { FileText, MapPin, Tags } from 'lucide-react'
import { Input, Label, Textarea } from '@/components/ui/Field'
import type { Doc } from '@/lib/gateway/data'
import { useMessages } from '@/lib/i18n'
import type { InstructionContent, Station } from '@/lib/model/types'
import { FormCard } from './FormParts'
import { LockoutEditor } from './LockoutEditor'
import { MetaCard, StationPicker } from './MetaCard'

export interface InstructionFieldsProps {
  content: InstructionContent
  onChange: (c: InstructionContent) => void
  readOnly?: boolean
  /** Un bloc commun : il ne va à aucun poste, et son nom remplace le titre. */
  block?: boolean
  stationIds: string[]
  stations: Doc<Station>[]
  onStations: (ids: string[]) => void
  onCreateStation?: (name: string) => Promise<string | null>
}

/**
 * Ce qui touche l'instruction entière : titre, résumé, postes, fiche (format, catégorie, EPI,
 * outils, mises en garde, étiquettes) et cadenassage. `dialog` : d'un bloc, dans la fenêtre des
 * infos (vue « Comme au poste ») ; `cards` : une carte par sujet, dans la fiche.
 */
export function InstructionFields({ layout, content, onChange, readOnly, block, stationIds, stations, onStations, onCreateStation }: InstructionFieldsProps & { layout: 'dialog' | 'cards' }) {
  const t = useMessages()
  const tp = t.editor.page
  const tf = t.editor.form
  const head = (
    <>
      <div>
        <Label htmlFor="instruction-title">{block ? t.blocks.name : tp.header.titleLabel}</Label>
        <Input id="instruction-title" value={content.title} readOnly={readOnly} onChange={(e) => onChange({ ...content, title: e.target.value })} className="h-14 text-lg font-black" />
      </div>
      <div>
        <Label htmlFor="instruction-summary">{tp.header.summaryLabel}</Label>
        <Textarea id="instruction-summary" rows={2} value={content.summary} readOnly={readOnly} onChange={(e) => onChange({ ...content, summary: e.target.value })} placeholder={block ? t.blocks.summaryPlaceholder : tp.header.summaryPlaceholder} />
      </div>
    </>
  )
  const lockout = content.kind === 'lockout' && content.lockout ? <LockoutEditor value={content.lockout} readOnly={readOnly} onChange={(lockout) => onChange({ ...content, lockout })} /> : null

  if (layout === 'dialog') {
    return (
      <div className="space-y-5">
        {head}
        <MetaCard embedded noStations={block} content={content} stationIds={stationIds} stations={stations} readOnly={readOnly} onChange={onChange} onStations={onStations} onCreateStation={onCreateStation} />
        {lockout}
      </div>
    )
  }
  return (
    <div className="space-y-4">
      <FormCard icon={<FileText className="h-4 w-4" />} title={block ? t.blocks.infoTitle : tf.instruction}>
        <div className="space-y-4">{head}</div>
      </FormCard>
      {!block && (
        <FormCard icon={<MapPin className="h-4 w-4" />} title={tf.where}>
          <StationPicker stationIds={stationIds} stations={stations} readOnly={readOnly} onStations={onStations} onCreateStation={onCreateStation} />
        </FormCard>
      )}
      <FormCard icon={<Tags className="h-4 w-4" />} title={tf.details}>
        <MetaCard embedded noStations content={content} stationIds={stationIds} stations={stations} readOnly={readOnly} onChange={onChange} onStations={onStations} onCreateStation={onCreateStation} />
      </FormCard>
      {lockout}
    </div>
  )
}
