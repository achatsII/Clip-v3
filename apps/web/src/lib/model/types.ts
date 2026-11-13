/**
 * Modèle de données de CLIP V3 (contenu de `json_data` sur la Gateway).
 *
 * Ces formes sont partagées par toutes les versions de l'app qui tournent en même temps :
 * on ajoute des champs facultatifs, on ne renomme ni ne retire rien.
 */

export type InstructionKind = 'procedure' | 'lockout'

export type CategoryKey = 'production' | 'maintenance' | 'qualite' | 'sst' | 'nettoyage' | 'changement' | 'demarrage' | 'autre'

export type InstructionStatus = 'draft' | 'review' | 'published' | 'archived'

export type SourceKind = 'photo' | 'video' | 'audio' | 'note' | 'document'

/** Un média ou une note capturés : la matière première de la génération. */
export interface Source {
  id: string
  kind: SourceKind
  url?: string
  path?: string
  name?: string
  mimeType?: string
  sizeBytes?: number
  durationSec?: number
  width?: number
  height?: number
  thumbnailUrl?: string
  /** Texte d'une note, ou transcription d'une note vocale. */
  text?: string
  geminiFileUri?: string
  geminiExpiresAt?: string
  pageCount?: number
  /** Nom du fichier d'origine quand un document Word a été converti en PDF. */
  originalName?: string
  createdAt: string
  capturedOn?: 'web' | 'ios' | 'android'
}

export type AnnotationType = 'pen' | 'highlight' | 'arrow' | 'line' | 'measure' | 'circle' | 'rect' | 'text' | 'number' | 'icon' | 'blur'
export type AnnotationColor = 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'white' | 'black'
export type AnnotationSize = 's' | 'm' | 'l' | 'xl' | 'xxl'

export interface Annotation {
  id: string
  type: AnnotationType
  /** Coordonnées relatives (0 à 1) à l'image : point d'ancrage, début d'un trait, coin d'un cadre. */
  x: number
  y: number
  /** Fin d'une flèche, d'une ligne ou d'une distance. */
  x2?: number
  y2?: number
  /** Largeur et hauteur d'un cercle, d'un cadre ou d'une zone floutée. */
  w?: number
  h?: number
  /** Crayon et surligneur : le tracé, en coordonnées relatives. */
  points?: Array<[number, number]>
  /** Texte d'une étiquette, d'un numéro, valeur d'une distance (« 12 mm »), ou légende d'une forme. */
  text?: string
  /** Icône (clé de src/lib/annotations/icons.ts). */
  icon?: string
  /** Épaisseur du trait ou taille de l'étiquette ; moyenne par défaut. */
  size?: AnnotationSize
  /** Agrandissement libre d'un numéro, d'une icône ou d'un texte (poignée), en plus de `size`. */
  scale?: number
  /** Trait pointillé : flèche, ligne, distance, cercle ou cadre. */
  dashed?: boolean
  /** Cercle ou cadre rempli d'une couleur transparente : une zone. */
  filled?: boolean
  color: AnnotationColor
}

/** Image figée d'une vidéo : on sait d'où elle vient, et on revient à l'extrait sans rien perdre. */
export interface VideoFrame {
  videoUrl: string
  /** L'instant figé, en secondes depuis le début de la vidéo. */
  at: number
  /** L'extrait vidéo correspondant. */
  start: number
  end: number
}

/** Un média montre ce qu'il faut faire, ou ce qu'il faut éviter (photo « bon » / « pas bon »). */
export type MediaVerdict = 'do' | 'dont'

/** Ce que tout média d'une étape peut porter : une légende courte et un verdict. */
interface MediaCommon {
  caption?: string
  verdict?: MediaVerdict
}

export type StepMedia = MediaCommon &
  (
    | { kind: 'image'; url: string; sourceId?: string; alt?: string; annotations?: Annotation[]; generated?: boolean; frame?: VideoFrame }
    | { kind: 'video'; url: string; sourceId?: string; start: number; end: number; posterUrl?: string; clip?: ReelClip }
    | { kind: 'document'; url: string; sourceId?: string; page?: number; pageImageUrl?: string; name?: string }
    /**
     * Un schéma généré par l'IA : une page HTML autonome (SVG, dessin, vue 3D), affichée dans un
     * cadre isolé (iframe sans accès à l'app). `url` reste vide : le HTML voyage avec l'instruction.
     */
    | { kind: 'html'; url: string; html: string; title?: string; sourceId?: string }
  )

/**
 * Où se trouve l'extrait dans « la vidéo des étapes » : une seule vidéo courte, montée par la
 * passerelle avec les extraits de toutes les étapes, dans l'ordre. Le poste ne télécharge que ces
 * secondes, et un seul lecteur passe d'une étape à l'autre. `src`, `start` et `end` disent ce qui a
 * été coupé : si l'extrait change ensuite, ce repère ne vaut plus (on relit la vidéo d'origine).
 */
export interface ReelClip {
  url: string
  /** Le début de l'extrait dans la vidéo des étapes, en secondes. */
  at: number
  src: string
  start: number
  end: number
}

/**
 * Comment l'étape montre ses médias : un à la fois (le premier, les autres au choix), côte à côte
 * pour comparer ce qu'il faut faire et ce qu'il faut éviter, ou tous en grille.
 */
export type StepLayout = 'focus' | 'compare' | 'grid'

export type WarningLevel = 'danger' | 'caution' | 'info'

export interface Step {
  id: string
  /** Verbe d'action à l'infinitif, court : « Retirer le garde de protection ». */
  title: string
  /** Une action, en une ou deux phrases courtes. */
  text: string
  keyPoints?: string[]
  warning?: { level: WarningLevel; text: string } | null
  media: StepMedia[]
  /** Disposition des médias ; un à la fois par défaut. */
  layout?: StepLayout
  durationSec?: number | null
  /** Pour une fiche de cadenassage : le point d'isolement que l'étape traite. */
  energyPointId?: string | null
  /**
   * La phase de l'instruction où se trouve l'étape (« Démontage ») : les étapes qui se suivent sous
   * le même nom forment une section (`src/lib/model/sections.ts`).
   */
  section?: string
  /** Ce que l'opérateur relève à cette étape, pour la trace (toggle `records`, `src/lib/model/checks.ts`). */
  checks?: Check[]
}

/**
 * Un relevé : ce que l'opérateur note à une étape. `measure` : une valeur avec son unité, jugée
 * entre `min` et `max` ; `yesno` : un oui ou un non, jugé sur `expected` ; `choice` : un choix,
 * dont certains sont des écarts ; `text` : un numéro de lot, une remarque ; `photo` : une preuve.
 * Les limites viennent des sources, jamais d'une supposition.
 */
export type CheckKind = 'measure' | 'yesno' | 'choice' | 'text' | 'photo'

export interface CheckOption {
  id: string
  label: string
  /** Ce choix est un écart (« Sale », « À remplacer »). */
  bad?: boolean
}

export interface Check {
  id: string
  kind: CheckKind
  /** Ce qu'on relève, en quelques mots : « Pression du circuit », « Joint en place ». */
  label: string
  unit?: string
  min?: number | null
  max?: number | null
  /** La valeur visée, montrée à l'opérateur (elle ne juge rien : `min` et `max` jugent). */
  target?: number | null
  /** La bonne réponse d'un oui ou non ; l'autre est un écart. Sans elle, rien n'est jugé. */
  expected?: 'yes' | 'no' | null
  options?: CheckOption[]
  /** Facultatif : on peut passer l'étape sans y répondre. */
  optional?: boolean
}

export type EnergyType = 'electrique' | 'pneumatique' | 'hydraulique' | 'mecanique' | 'gravite' | 'thermique' | 'chimique' | 'vapeur' | 'eau' | 'autre'

export interface EnergyPoint {
  id: string
  /** Repère affiché sur l'équipement : E1, P1, H1… */
  tag: string
  type: EnergyType
  description: string
  magnitude?: string
  isolationDevice: string
  location: string
  lockingMethod: string
  verification: string
  photoUrl?: string
}

export interface LockoutData {
  equipment: string
  location?: string
  locksRequired?: number
  /** Matériel requis : cadenas, moraillons, étiquettes… */
  material?: string[]
  energyPoints: EnergyPoint[]
  /** Remise en marche : étapes de retrait des cadenas. */
  restartSteps?: string[]
}

export interface InstructionContent {
  title: string
  summary: string
  kind: InstructionKind
  category: CategoryKey
  tags: string[]
  equipment?: string
  frequency?: string
  durationMin?: number | null
  ppe: string[]
  tools: string[]
  safety: string[]
  steps: Step[]
  lockout?: LockoutData | null
  language: string
  translations?: Record<string, TranslatedContent>
  /** Les questions de formation (toggle `training`) : vérifier qu'on a compris, en quelques questions. */
  quiz?: QuizQuestion[]
}

/** Une question de formation : quelques choix courts, un seul bon, et pourquoi. */
export interface QuizQuestion {
  id: string
  question: string
  /** 2 à 4 choix. */
  choices: string[]
  /** Le bon choix (son rang). */
  answer: number
  /** Pourquoi c'est la bonne réponse, montré après la réponse. */
  why?: string
  /** L'étape dont parle la question. */
  stepId?: string | null
}

/**
 * Une formation validée (ou non) au poste (`clip_training`) : qui, sur quelle version de quelle
 * instruction, sa note et ses réponses. Écrite une fois ; la matrice de compétences la lit.
 */
export interface Training extends OperatorRef {
  instructionId: string
  instructionTitle: string
  version: number | null
  stationId: string | null
  /** De 0 à 1. */
  score: number
  passed: boolean
  answers: Array<{ questionId: string; choice: number; correct: boolean }>
  at: string
  language: string
  source: 'kiosk' | 'link' | 'app'
  /** La personne connectée, quand ce n'est pas une personne de l'équipe nommée à la tablette. */
  userId?: string | null
  userName?: string | null
}

/**
 * Une traduction, rangée à côté du contenu : ce que l'opérateur lit dans sa langue. Les médias
 * ne changent pas, sauf ce qu'une traduction de média leur donne (`MediaTranslation`).
 */
export interface TranslatedContent {
  title: string
  summary: string
  safety: string[]
  steps: Array<{
    id: string
    title: string
    text: string
    keyPoints?: string[]
    warning?: string | null
    /** Le nom de sa section, dans cette langue. */
    section?: string
    /** Les médias de l'étape dans cette langue, dans l'ordre des médias (null : rien à traduire). */
    media?: Array<MediaTranslation | null>
    /** Les relevés dans cette langue : le libellé, et celui de chaque choix (par id). */
    checks?: Array<{ id: string; label?: string; options?: Record<string, string> }>
  }>
  tools?: string[]
  equipment?: string
  lockout?: LockoutTranslation
  /** Les questions de formation dans cette langue (par id). */
  quiz?: Array<{ id: string; question?: string; choices?: string[]; why?: string }>
  /** Quand la traduction a été faite, et si les images avec du texte ont été refaites. */
  translatedAt?: string
  images?: boolean
}

/**
 * Un média dans une autre langue : sa légende, le texte de ses annotations, un schéma au texte
 * traduit, ou l'image refaite par l'IA avec son texte traduit. `of` nomme le média d'origine
 * (`mediaKey`) : s'il a changé depuis, cette traduction ne s'applique plus.
 */
export interface MediaTranslation {
  of: string
  caption?: string
  alt?: string
  /** Le texte des annotations, par identifiant d'annotation. */
  labels?: Record<string, string>
  /** Un schéma : la page avec son texte traduit, et son titre. */
  html?: string
  title?: string
  /** Une image refaite par l'IA, son texte traduit. */
  url?: string
}

/** La fiche de cadenassage dans une autre langue (les repères E1, P1… ne changent pas). */
export interface LockoutTranslation {
  equipment?: string
  location?: string
  material?: string[]
  restartSteps?: string[]
  energyPoints?: Array<{ id: string; description?: string; magnitude?: string; isolationDevice?: string; location?: string; lockingMethod?: string; verification?: string }>
}

export interface GenerationInfo {
  at: string
  model: string | null
  operation: string
  rating?: 'up' | 'down' | null
  comment?: string | null
  /** Ce que l'IA n'a pas pu trancher : affiché à la personne comme « À vérifier ». */
  questions?: string[]
  /**
   * Les réponses proposées à une question (clé : son texte), quand la réponse est l'un de quelques
   * choix clairs ; jamais une valeur inventée. Absent pour une question à réponse libre.
   */
  choices?: Record<string, string[]>
  /** Poste deviné par l'IA (texte libre), avant rapprochement. */
  stationGuess?: string | null
}

export interface ReviewRequest {
  requestedBy: string
  requestedByName: string
  requestedAt: string
  approverIds: string[]
  note?: string | null
  /** Retour d'un approbateur qui demande des changements. */
  changesRequested?: { by: string; byName: string; at: string; comment: string } | null
  /** Approbation à plusieurs : la signature de chaque groupe, pour le contenu signé. */
  signatures?: Signature[]
  /** Un changement important : à la publication, les formations d'avant ne comptent plus (toggle `training`). */
  retrain?: boolean
}

/** Un groupe qui signe les instructions (« Qualité », « Chef d'atelier ») et ceux qui le représentent. */
export interface ApprovalGroup {
  id: string
  name: string
  /** Les personnes (approbateurs ou administrateurs) qui signent pour le groupe ; vide : tout approbateur. */
  memberIds: string[]
}

/** La signature d'un groupe : qui, quand, et l'empreinte du contenu signé (modifié ensuite : à refaire). */
export interface Signature {
  groupId: string
  groupName: string
  by: string
  byName: string
  at: string
  hash: string
}

/**
 * Une génération en cours, écrite par l'appareil qui la fait (elle tourne là où on l'a lancée) :
 * les autres appareils la voient, et savent qu'elle s'est interrompue quand le signe de vie cesse.
 */
export interface GeneratingInfo {
  startedAt: string
  /** Dernier signe de vie de l'appareil qui génère (toutes les 30 s). */
  heartbeatAt: string
  /** L'étape en cours : prepare, analyze ou finish. */
  stage: string
  detail?: string | null
  byName?: string | null
  /** La coquille (téléphone, tablette) ou le navigateur. */
  device: 'app' | 'web'
}

export interface Instruction {
  title: string
  kind: InstructionKind
  category: CategoryKey
  tags: string[]
  stationIds: string[]
  status: InstructionStatus
  /** Une idée de départ dictée ou tapée par la personne (« nettoyage des rails, machine 1234 »). */
  intent?: string
  sources: Source[]
  /** La copie de travail. `null` tant que rien n'a été généré ni écrit. */
  draft: InstructionContent | null
  /** Le brouillon diffère-t-il de la version publiée ? */
  dirty?: boolean
  publishedVersion: number | null
  publishedId: string | null
  publishedAt?: string | null
  review?: ReviewRequest | null
  generation?: GenerationInfo | null
  /** Une génération en cours sur un appareil ; `null` une fois finie (réussie ou non). */
  generating?: GeneratingInfo | null
  /** La dernière génération qui n'a pas abouti, pour l'annoncer aux autres appareils. */
  generationError?: { at: string; message: string } | null
  origin?: 'capture' | 'import' | 'duplicate' | 'feedback'
  authorId: string
  authorName: string
  updatedBy?: string
  updatedByName?: string
  /** L'appareil (onglet) qui a écrit le brouillon, et lequel : l'écran ouvert ailleurs suit ses changements. */
  updatedFrom?: string
  updatedVia?: 'app' | 'web'
  createdAt: string
  updatedAt: string
  /** Lien public direct (uuid d'un lien de redirection). */
  shareLinkId?: string | null
  /** La relecture périodique (« à revoir dans 1 an ») ; absente avant la première publication. */
  renewal?: Renewal | null
  /** Le numéro de document (« IT-0042 »), donné à la première publication et gardé ensuite. */
  number?: string | null
  /**
   * L'index de recherche : numéro, titre, étiquettes, équipement, étapes, en minuscules et sans
   * accents (`src/lib/model/search.ts`). Tenu à chaque enregistrement ; la recherche se fait au serveur.
   */
  searchText?: string
  /** Le nombre de questions de formation de la version publiée. */
  publishedQuiz?: number
  /** Les formations d'avant cette version ne comptent plus : un changement important demande de se re-former. */
  trainingVersion?: number | null
  /** Copies légères pour les listes (évite de lire le brouillon complet). */
  coverUrl?: string | null
  stepCount?: number
  sourceCount?: number
}

export interface Version {
  instructionId: string
  number: number
  content: InstructionContent
  stationIds: string[]
  publishedBy: string
  publishedByName: string
  approvedBy?: string | null
  approvedByName?: string | null
  /** Approbation à plusieurs : la signature de chaque groupe. */
  approvals?: Array<{ group: string; byName: string; at: string }>
  changelog: string
  createdAt: string
}

/**
 * Pourquoi un point de retour du brouillon existe : posé tout seul pendant qu'on modifie (au plus un
 * par 10 minutes), avant un passage de l'assistant, avant de régénérer, avant de revenir à une autre
 * version, ou tel que l'IA l'a créé.
 */
export type CheckpointReason = 'auto' | 'agent' | 'regenerate' | 'restore' | 'generated'

/** Un état enregistré du brouillon, pour y revenir plus tard (même après avoir fermé l'app). */
export interface DraftCheckpoint {
  instructionId: string
  content: InstructionContent
  reason: CheckpointReason
  /** La demande faite à l'assistant, ou la version qu'on a remise. */
  note: string | null
  /** L'empreinte du contenu : deux points de retour identiques ne s'enregistrent pas. */
  hash: string
  title: string
  stepCount: number
  at: string
  byId: string
  byName: string
}

export interface Branding {
  orgName: string
  logoUrl?: string | null
  color?: string | null
}

/** La version publiée courante d'une instruction, lisible par les liens publics. */
export interface Published {
  instructionId: string
  version: number
  content: InstructionContent
  stationIds: string[]
  branding: Branding
  publishedAt: string
  /** Lecture à voix haute déjà produite, par étape et par langue (`${stepId}:${lang}`). */
  audio?: Record<string, string>
  /** Ce que la liste d'un poste affiche, sans charger le contenu (écrit à la publication). */
  card?: PublishedCard
  /** L'index de recherche de la version publiée (les liens publics cherchent au serveur). */
  searchText?: string
}

/** La fiche légère d'une instruction publiée : la liste d'un poste ne lit qu'elle. */
export interface PublishedCard {
  title: string
  category: CategoryKey
  kind: InstructionKind
  cover: string | null
  stepCount: number
  durationMin?: number | null
  number?: string | null
  /** Les langues offertes : celle d'origine, puis les traductions. */
  languages: string[]
}

export type StationKind = 'poste' | 'equipement' | 'zone'

export interface Station {
  /** Le lien de service des avertissements, scellé par le serveur (toggle `notify`) : la tablette le transmet sans pouvoir l'ouvrir. */
  notifySeal?: string | null
  name: string
  code?: string
  kind: StationKind
  area?: string
  description?: string
  /** Lien public du poste (tablette, code QR). */
  linkId?: string | null
  /** `focus` : ses instructions d'abord, les autres à un geste ; `only` : seulement les siennes. */
  linkMode?: 'focus' | 'only'
  linkCreatedAt?: string | null
  /** La version de la portée du lien (`LINK_SCOPE_VERSION`) : un lien plus ancien se met à jour. */
  linkVersion?: number
  /** Les anciens liens qui suivent le lien courant (mis à jour, pas révoqués) : un code QR imprimé reste bon. */
  linkFollow?: string[]
  /** Le lien ouvre-t-il l'assistant vocal ? (gardé pour le mettre à jour sans le perdre) */
  linkAssistant?: boolean
  /** Au poste, demander qui travaille (nom et code à 4 chiffres) avant d'ouvrir une instruction. */
  askOperator?: boolean
  createdAt: string
}

/** Les quarts de travail, pour regrouper les personnes. */
export type Shift = 'jour' | 'soir' | 'nuit' | 'fds' | 'rotation'

/**
 * Une personne qui travaille aux postes, sans compte : son nom, et l'empreinte de son code à
 * 4 chiffres (jamais le code lui-même, `src/lib/server/operators.ts`).
 */
export interface Operator {
  name: string
  pinHash?: string | null
  /** Quand le code a été donné (pour dire « code donné le… »). */
  pinSetAt?: string | null
  team?: string
  shift?: Shift | null
  /** Les postes où elle travaille d'habitude : son nom y vient en premier. */
  stationIds: string[]
  active: boolean
  createdAt: string
}

/** Qui travaillait au poste, sur un événement, un retour ou une exécution. */
export interface OperatorRef {
  operatorId?: string | null
  operatorName?: string | null
}

export type FeedbackKind = 'unclear' | 'error' | 'danger' | 'idea' | 'praise'

export interface Feedback extends OperatorRef {
  instructionId: string
  publishedId?: string
  version?: number | null
  stepId?: string | null
  stepIndex?: number | null
  instructionTitle?: string
  kind: FeedbackKind
  comment?: string
  photoUrl?: string | null
  authorName?: string | null
  source: 'kiosk' | 'link' | 'app'
  stationId?: string | null
  status: 'new' | 'done' | 'dismissed'
  resolution?: string | null
  resolvedBy?: string | null
  resolvedAt?: string | null
  createdAt: string
}

export type EventType = 'view' | 'complete' | 'scan' | 'ai'

export interface UsageEvent extends OperatorRef {
  type: EventType
  instructionId?: string | null
  stationId?: string | null
  version?: number | null
  durationSec?: number | null
  source: 'kiosk' | 'link' | 'app'
  deviceId?: string | null
  operation?: string | null
  model?: string | null
  tokens?: number | null
  userId?: string | null
  at: string
}

/** Une réponse à un relevé, telle qu'au moment du travail (l'instruction peut changer ensuite). */
export interface ExecutionAnswer {
  stepId: string
  stepTitle: string
  checkId: string
  label: string
  kind: CheckKind
  /** measure : un nombre ; yesno : true ou false ; choice et text : le texte ; photo : l'adresse. */
  value: number | boolean | string | null
  unit?: string
  min?: number | null
  max?: number | null
  /** true : dans la norme ; false : un écart ; null : rien à juger (texte, photo, sans limites). */
  ok: boolean | null
  /** Ce que la personne a fait devant un écart (exigé pour continuer). */
  note?: string
}

/**
 * Le travail fait (`clip_execution`) : qui, quand, à quel poste, et chaque relevé. Écrit une fois, à
 * la fin de l'instruction, par la tablette (jeton invité) ou par l'app ; jamais modifié ensuite.
 */
export interface Execution extends OperatorRef {
  instructionId: string
  instructionTitle: string
  version: number | null
  stationId: string | null
  source: 'kiosk' | 'link' | 'app'
  startedAt: string
  finishedAt: string
  answers: ExecutionAnswer[]
  /** Le nombre de réponses hors norme. */
  deviations: number
  /** La langue dans laquelle la personne a lu l'instruction. */
  language: string
  deviceId?: string
  /** La personne connectée, quand ce n'est pas une personne de l'équipe nommée à la tablette. */
  userId?: string | null
  userName?: string | null
}

export type MemberRole = 'admin' | 'author' | 'approver' | 'reader'

export interface MemberSettings {
  role: MemberRole
  categories: CategoryKey[]
  stationIds: string[]
  name?: string
  email?: string
}

export interface WritingStandard {
  /** Règles en mots simples, lues par l'IA à chaque génération. */
  rules: string[]
  startWithSafety: boolean
  maxWordsPerStep: number
  tone: 'tu' | 'vous' | 'infinitif'
  /** Vocabulaire propre à l'usine : terme → sens. */
  glossary: Array<{ term: string; meaning: string }>
  version: number
  updatedAt: string
  updatedByName?: string
}

/** La relecture périodique d'une instruction publiée (`src/lib/model/renewal.ts`). */
export interface Renewal {
  /** Tous les N mois ; null : jamais. */
  months: number | null
  /** La prochaine relecture ; null sans échéance. */
  dueAt: string | null
  /** La dernière publication ou confirmation « toujours bonne », et par qui. */
  lastAt?: string | null
  lastByName?: string | null
}

export interface OrgSettings {
  name: string
  /** La numérotation des documents : un préfixe (« IT ») et le prochain numéro. */
  numbering?: { prefix: string; next: number }
  logoUrl?: string | null
  color?: string | null
  /**
   * `none` : on publie directement ; `one` : une approbation suffit ; `all` : chaque groupe signe
   * (toggle `multiApproval` ; coupé, `all` se comporte comme `one`).
   */
  approval: { mode: 'none' | 'one' | 'all'; approverIds: string[]; groups?: ApprovalGroup[] }
  /** Avertir les bonnes personnes (toggle `notify`). */
  notify?: NotifySettings
  feedback: { notifyDanger: boolean }
  standard: WritingStandard
  standardHistory: WritingStandard[]
  /** Ce que la génération retient des avis donnés sur ses brouillons. */
  learnings: Array<{ text: string; at: string }>
  members: Record<string, MemberSettings>
  goals: CategoryKey[]
  onboardedAt?: string | null
  roi: { hoursSavedPerInstruction: number; hourlyRate: number; minutesSavedPerCompletion: number }
  /** À revoir tous les N mois, par défaut, à la publication (null : jamais ; absent : chaque année). */
  renewalMonths?: number | null
  /** Qui a ouvert CLIP le premier dans l'organisation : administrateur tant que personne d'autre ne l'est. */
  createdBy?: string
  createdAt: string
}

/** Les avertissements de l'usine : qui est averti d'un danger ou d'un écart, et le lien de service. */
export interface NotifySettings {
  on: boolean
  danger: boolean
  deviation: boolean
  /** Ceux qu'un danger signalé ou un écart relevé avertit. */
  recipients: string[]
  /** Le lien de service, scellé par le serveur : seul lui peut l'ouvrir pour envoyer. */
  sealed?: string | null
  /** Le lien de service peut-il envoyer des courriels ? (le droit du compte qui l'a créé) */
  email?: boolean
  setAt?: string
  setByName?: string
}

/** Comment joindre une personne (`clip_contact`) : une fiche par personne, tenue par son app. */
export interface Contact {
  userId: string
  name: string
  email?: string | null
  /** La langue de ses avertissements (celle de son outil). */
  lang: string
  /** Les téléphones où la coquille a reçu le droit d'avertir. */
  pushTokens: Array<{ token: string; platform: 'ios' | 'android'; updatedAt: string }>
  /** Être averti par courriel, sur son téléphone. */
  emails: boolean
  push: boolean
  updatedAt: string
}
