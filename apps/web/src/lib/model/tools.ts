/**
 * Les outils et le matériel, en images : au poste (« Outils et matériel », en tuiles), dans l'éditeur
 * et dans le PDF, chaque outil a un emoji qui le montre. Un emoji se reconnaît d'un coup d'œil, en
 * couleur, partout (tablette, téléphone, PDF), sans image à charger ni à générer.
 *
 * L'emoji voyage en tête du texte de l'outil (« 🔦 Lampe frontale ») : celui que l'IA met à la
 * génération, ou celui que l'auteur choisit d'un toucher. Il suit ainsi l'ordre, les modifications et
 * les traductions, sans rien changer à la forme des données. Sans emoji (une ancienne instruction, un
 * outil tapé à la main), le nom de l'outil le donne : clé → 🔧, tournevis → 🪛, sinon 🧰.
 */

export interface ToolIcon {
  emoji: string
  /** Le nom de l'outil, sans son emoji. */
  label: string
}

/** Un emoji en tête : un pictogramme, ses variantes et ses jonctions (⚙️, 🛠️). */
const LEADING = /^(?![\u00A9\u00AE\u2122])(\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic}\uFE0F?)*)\s*/u

/** Ce que le nom appelle, du plus précis au plus général (comparé sans accents, en minuscules). */
const BY_NAME: Array<[RegExp, string]> = [
  [/\bcle (de|du|d) (cadenas|porte|armoire|coffre|casier)|\bkey (for|to)\b|\bpadlock key/, '🔑'],
  [/pistolet a (graisse|graisser)|grease gun/, '🛢️'],
  [/pistolet a colle|glue gun/, '🧴'],
  [/soufflette|air comprime|compressed air|blow ?gun/, '💨'],
  [/ruban a mesurer|metre a ruban|galon|tape measure|measuring tape/, '📏'],
  [/fer a souder|chalumeau|soudeuse|poste a souder|soldering|welder|welding|torch\b/, '🔥'],
  [/ruban adhesif|duct tape|\btape\b|adhesif/, '🩹'],
  [/tournevis|embout|screwdriver|\bbits?\b/, '🪛'],
  [/\bcles?\b|\bclef|wrench|spanner|douille|cliquet|socket|ratchet|dynamometrique|torque/, '🔧'],
  [/marteau|maillet|\bmasse\b|hammer|mallet/, '🔨'],
  [/\bscie|\bsaw\b|hacksaw/, '🪚'],
  [/ciseaux|cisaille|scissors|shears|coupe-fil|wire cutter/, '✂️'],
  [/couteau|cutter|exacto|\blame\b|knife|blade|grattoir|scraper/, '🔪'],
  [/pince|etau|serre-joint|tenaille|clamp|\bvise\b|pliers/, '🗜️'],
  [/\bregle\b|pied a coulisse|vernier|micrometre|caliper|ruler|\bmetre\b/, '📏'],
  [/equerre|rapporteur|niveau a bulle|\bsquare\b|spirit level/, '📐'],
  [/lampe|torche|frontale|flashlight|headlamp|lantern/, '🔦'],
  [/cadenas|\block\b|padlock|verrou/, '🔒'],
  [/etiquette|\btags?\b|\blabels?\b/, '🏷️'],
  [/\bgants?\b|gloves?/, '🧤'],
  [/lunettes|goggles|safety glasses/, '🥽'],
  [/eponge|sponge|tampon a recurer|scrub/, '🧽'],
  [/chiffon|\blinges?\b|torchon|essuie|papier|rags?\b|cloth|wipes?\b|towels?/, '🧻'],
  [/pinceau|paintbrush|rouleau a peinture|paint roller/, '🖌️'],
  [/balai|brosse|aspirateur|broom|brush|vacuum/, '🧹'],
  [/\bseau|chaudiere|bucket|\bpail\b/, '🪣'],
  [/huile|graisse|lubrifiant|oil\b|grease|lubricant/, '🛢️'],
  [/nettoyant|solvant|alcool|savon|degraissant|detergent|desinfectant|colle|scellant|silicone|vaporisateur|cleaner|solvent|soap|degreaser|glue|sealant|spray/, '🧴'],
  [/\bvis\b|boulon|ecrou|rondelle|goupille|rivet|\bbolts?\b|\bnuts?\b|\bscrews?\b|washer/, '🔩'],
  [/piece|engrenage|roulement|filtre|courroie|\bjoints?\b|garniture|\bparts?\b|gear|bearing|filter|belt|gasket|seal/, '⚙️'],
  [/aimant|magnet/, '🧲'],
  [/rallonge|cable|\bfils?\b|prise|extension cord|\bplug|\bcord\b/, '🔌'],
  [/batterie|\bpiles?\b|battery|batteries/, '🔋'],
  [/echelle|escabeau|ladder|stepladder|step stool/, '🪜'],
  [/chariot|transpalette|diable|\bcart\b|trolley|pallet jack|dolly/, '🛒'],
  [/ordinateur|portable|laptop|computer|\bpc\b/, '💻'],
  [/tablette|telephone|cellulaire|tablet|phone/, '📱'],
  [/scanner|lecteur de code|barcode|douchette|multimetre|voltmetre|testeur|multimeter|voltmeter|tester/, '📟'],
  [/manometre|jauge|gauge|pressure gauge/, '⏲️'],
  [/thermometre|thermometer|pyrometre/, '🌡️'],
  [/chronometre|minuterie|stopwatch|timer/, '⏱️'],
  [/balance|\bscale\b|peson/, '⚖️'],
  [/loupe|magnif/, '🔍'],
  [/eprouvette|reactif|bandelette|test kit|reagent|test strip/, '🧪'],
  [/crayon|stylo|marqueur|feutre|\bpen\b|pencil|marker/, '🖊️'],
  [/formulaire|fiche|feuille|registre|checklist|clipboard|\bform\b|log ?sheet/, '📋'],
  [/extincteur|extinguisher/, '🧯'],
  [/crochet|\bhook/, '🪝'],
  [/chaine|elingue|sling|chain/, '⛓️'],
  [/poubelle|sac a dechets|dechets|trash|garbage|waste bag/, '🗑️'],
  [/ampoule|\bbulb\b/, '💡'],
  [/\beau\b|water/, '💧'],
  [/coffre|boite a outils|trousse|toolbox|tool kit|\bkit\b/, '🧰'],
]

/** Rien de reconnu : la boîte à outils. */
export const DEFAULT_TOOL_EMOJI = '🧰'

/** Les emojis offerts quand l'auteur en choisit un (ceux qu'on reconnaît, une fois chacun). */
export const TOOL_PALETTE: string[] = [...new Set([...BY_NAME.map(([, e]) => e), '🛠️', DEFAULT_TOOL_EMOJI])]

const plain = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

/** L'emoji d'un outil et son nom : celui en tête du texte, sinon celui que le nom appelle. */
export function toolIcon(tool: string): ToolIcon {
  const text = tool.trim()
  const m = LEADING.exec(text)
  if (m) return { emoji: m[1], label: text.slice(m[0].length).trim() }
  const name = plain(text)
  const hit = BY_NAME.find(([re]) => re.test(name))
  return { emoji: hit ? hit[1] : DEFAULT_TOOL_EMOJI, label: text }
}

/** L'outil avec cet emoji en tête (il remplace celui qui y était). */
export function withToolEmoji(tool: string, emoji: string): string {
  const { label } = toolIcon(tool)
  return label ? `${emoji} ${label}` : emoji
}

/**
 * Les outils traduits gardent l'emoji de l'original quand la traduction l'a perdu (même rang) :
 * l'image reste la même dans toutes les langues.
 */
export function keepToolEmojis(original: string[], translated: string[]): string[] {
  return translated.map((t, i) => {
    const o = original[i]
    if (!o || LEADING.test(t.trim())) return t
    const m = LEADING.exec(o.trim())
    return m ? `${m[1]} ${t.trim()}` : t
  })
}
