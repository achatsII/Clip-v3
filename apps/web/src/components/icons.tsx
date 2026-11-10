import {
  Brush,
  ClipboardCheck,
  Cog,
  Ear,
  Factory,
  FileText,
  Flame,
  Footprints,
  Gauge,
  Glasses,
  Hand,
  HardHat,
  HeartPulse,
  Image as ImageIcon,
  Layers,
  Link2,
  Lock,
  Mic,
  Power,
  RefreshCw,
  ScanFace,
  Shirt,
  ShieldAlert,
  StickyNote,
  Video,
  Wind,
  Wrench,
  Zap,
  Droplets,
  ArrowDownToLine,
  Thermometer,
  FlaskConical,
  CloudFog,
  Waves,
  CircleHelp,
} from 'lucide-react'
import type { LucideProps } from 'lucide-react'
import type { CategoryKey, EnergyType, InstructionKind, SourceKind } from '@/lib/model/types'

export function CategoryIcon({ category, ...props }: { category: CategoryKey } & LucideProps) {
  const map = {
    production: Factory,
    maintenance: Wrench,
    qualite: ClipboardCheck,
    sst: HeartPulse,
    nettoyage: Brush,
    changement: RefreshCw,
    demarrage: Power,
    autre: Layers,
  } satisfies Record<CategoryKey, unknown>
  const C = map[category] ?? Layers
  return <C {...props} />
}

export function KindIcon({ kind, ...props }: { kind: InstructionKind } & LucideProps) {
  const C = kind === 'lockout' ? Lock : Layers
  return <C {...props} />
}

export function SourceIcon({ kind, ...props }: { kind: SourceKind } & LucideProps) {
  const map = { photo: ImageIcon, video: Video, audio: Mic, note: StickyNote, document: FileText } satisfies Record<SourceKind, unknown>
  const C = map[kind] ?? FileText
  return <C {...props} />
}

export function PpeIcon({ ppe, ...props }: { ppe: string } & LucideProps) {
  const map: Record<string, typeof HardHat> = {
    casque: HardHat,
    lunettes: Glasses,
    gants: Hand,
    'gants-coupure': Hand,
    'protection-auditive': Ear,
    bottes: Footprints,
    visiere: ScanFace,
    masque: Wind,
    harnais: Link2,
    'vetements-ignifuges': Flame,
    dossard: Shirt,
    tablier: Shirt,
  }
  const C = map[ppe] ?? ShieldAlert
  return <C {...props} />
}

export function EnergyIcon({ type, ...props }: { type: EnergyType } & LucideProps) {
  const map = {
    electrique: Zap,
    pneumatique: Gauge,
    hydraulique: Droplets,
    mecanique: Cog,
    gravite: ArrowDownToLine,
    thermique: Thermometer,
    chimique: FlaskConical,
    vapeur: CloudFog,
    eau: Waves,
    autre: CircleHelp,
  } satisfies Record<EnergyType, unknown>
  const C = map[type] ?? CircleHelp
  return <C {...props} />
}
