/**
 * Schémas de sortie structurée (`json_schema` d'AskAI v4). Volontairement simples : objets,
 * tableaux, énumérations, sans `oneOf` ni `null`, pour passer chez les trois fournisseurs.
 * Les contraintes de longueur sont retirées par la route chez Anthropic : on revalide côté app.
 */
import { CATEGORY_KEYS, ENERGY, PPE } from '../model/catalog'

const str = (description?: string) => ({ type: 'string', ...(description ? { description } : {}) })
const num = (description?: string) => ({ type: 'number', ...(description ? { description } : {}) })
const strList = (description?: string) => ({ type: 'array', items: { type: 'string' }, ...(description ? { description } : {}) })

const mediaRef = {
  type: 'object',
  properties: {
    source: str('Identifiant de la source : S1, S2…'),
    start: num("Vidéo, extrait : début, en secondes depuis le début de la vidéo"),
    end: num("Vidéo, extrait : fin, en secondes"),
    at: num("Vidéo, image fixe : l'instant à figer, en secondes (à la place d'un extrait)"),
    focus: { type: 'array', items: { type: 'number' }, description: "Image fixe : [ymin, xmin, ymax, xmax] de 0 à 1000 autour de ce qu'il faut regarder ; vide si ce n'est pas clairement visible" },
    focusLabel: str("Image fixe : ce que montre la marque, 1 à 3 mots (ex. « Bouton vert »)"),
    page: num('Document : numéro de page, 1 = première page'),
  },
  required: ['source'],
}

const stepSchema = {
  type: 'object',
  properties: {
    id: str("Identifiant de l'étape existante à conserver ; vide pour une nouvelle étape"),
    title: str("Verbe d'action à l'infinitif + objet, 2 à 8 mots"),
    text: str('Une seule action, phrases courtes et simples'),
    keyPoints: strList('0 à 3 points clés : ce qui fait réussir, avec la raison'),
    warningLevel: { type: 'string', enum: ['none', 'info', 'caution', 'danger'] },
    warningText: str('Texte de la mise en garde ; vide si aucune'),
    media: { type: 'array', items: mediaRef, description: '0 à 2 médias, le meilleur en premier' },
    durationSec: num('Durée approximative de l’étape en secondes ; 0 si inconnue'),
    energyTag: str('Fiche de cadenassage : repère du point d’isolement traité (E1, P1…) ; vide sinon'),
  },
  required: ['title', 'text', 'keyPoints', 'warningLevel', 'warningText', 'media'],
}

const lockoutSchema = {
  type: 'object',
  properties: {
    equipment: str("Nom et numéro de l'équipement"),
    location: str("Où se trouve l'équipement"),
    locksRequired: num('Nombre de cadenas requis'),
    material: strList('Matériel requis : cadenas, moraillons, étiquettes…'),
    energyPoints: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          tag: str('Repère : E1, P1, H1…'),
          type: { type: 'string', enum: Object.keys(ENERGY) },
          description: str("Ce qu'est la source d'énergie"),
          magnitude: str('Magnitude si connue : 600 V, 90 psi… ; vide sinon'),
          isolationDevice: str("Dispositif d'isolement : sectionneur, vanne…"),
          location: str('Où se trouve le dispositif'),
          lockingMethod: str('Comment cadenasser'),
          verification: str("Comment vérifier l'absence d'énergie"),
          photoSource: str('Source (S1…) qui montre le dispositif ; vide sinon'),
        },
        required: ['tag', 'type', 'description', 'isolationDevice', 'location', 'lockingMethod', 'verification'],
      },
    },
    restartSteps: strList('Retrait des cadenas et remise en marche, dans l’ordre'),
  },
  required: ['equipment', 'energyPoints', 'restartSteps'],
}

export const instructionSchema = {
  type: 'object',
  properties: {
    title: str("Titre court : action + objet + équipement (ex. « Nettoyer les rails de la machine 1234 »)"),
    summary: str("À quoi sert l'instruction, en une phrase"),
    kind: { type: 'string', enum: ['procedure', 'lockout'] },
    category: { type: 'string', enum: CATEGORY_KEYS },
    tags: strList('2 à 6 mots-clés de recherche, en minuscules'),
    station: str('Poste, machine ou équipement visé, tel que nommé ; vide si inconnu'),
    equipment: str('Équipement principal ; vide si inconnu'),
    frequency: str('Fréquence si dite (« une fois par mois ») ; vide sinon'),
    durationMin: num('Durée totale estimée en minutes ; 0 si inconnue'),
    ppe: { type: 'array', items: { type: 'string', enum: Object.keys(PPE) } },
    tools: strList('Outils et matériel nécessaires'),
    safety: strList('Mises en garde générales, avant de commencer'),
    steps: { type: 'array', items: stepSchema },
    lockout: lockoutSchema,
    questions: strList('Au plus 4 points que les sources ne permettent pas de trancher, à faire vérifier'),
  },
  required: ['title', 'summary', 'kind', 'category', 'tags', 'station', 'ppe', 'tools', 'safety', 'steps', 'questions'],
}

export const stepEditSchema = {
  type: 'object',
  properties: {
    title: str("Verbe d'action à l'infinitif + objet, 2 à 8 mots"),
    text: str('Une seule action, phrases courtes'),
    keyPoints: strList('0 à 3 points clés'),
    warningLevel: { type: 'string', enum: ['none', 'info', 'caution', 'danger'] },
    warningText: str('Texte de la mise en garde ; vide si aucune'),
    explanation: str('Ce que tu as changé, en une phrase'),
  },
  required: ['title', 'text', 'keyPoints', 'warningLevel', 'warningText', 'explanation'],
}

export const instructionEditSchema = {
  type: 'object',
  properties: {
    title: str('Titre'),
    summary: str('Résumé'),
    ppe: { type: 'array', items: { type: 'string', enum: Object.keys(PPE) } },
    tools: strList(),
    safety: strList(),
    steps: { type: 'array', items: stepSchema },
    explanation: str('Ce que tu as changé, en une ou deux phrases'),
  },
  required: ['title', 'summary', 'ppe', 'tools', 'safety', 'steps', 'explanation'],
}

export const translationSchema = {
  type: 'object',
  properties: {
    title: str(),
    summary: str(),
    safety: strList(),
    steps: {
      type: 'array',
      items: {
        type: 'object',
        properties: { id: str(), title: str(), text: str(), keyPoints: strList(), warning: str('Vide si aucune') },
        required: ['id', 'title', 'text', 'keyPoints', 'warning'],
      },
    },
  },
  required: ['title', 'summary', 'safety', 'steps'],
}

export const annotationSchema = {
  type: 'object',
  properties: {
    marks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          label: str('Ce que la marque montre, 1 à 4 mots'),
          shape: { type: 'string', enum: ['circle', 'rect', 'arrow'] },
          box: { type: 'array', items: { type: 'number' }, description: '[ymin, xmin, ymax, xmax] normalisés de 0 à 1000' },
          color: { type: 'string', enum: ['red', 'orange', 'yellow', 'green', 'blue', 'white', 'black'], description: 'Rouge par défaut ; la couleur demandée sinon' },
        },
        required: ['label', 'shape', 'box'],
      },
      description: '1 à 5 marques, sur ce que le geste de l’étape touche ou sur ce qui est demandé',
    },
  },
  required: ['marks'],
}

export const illustrationSchema = {
  type: 'object',
  properties: {
    prompt: str("Description en anglais de l'illustration à produire"),
  },
  required: ['prompt'],
}

export const answerSchema = {
  type: 'object',
  properties: {
    answer: str('Réponse courte et concrète, 40 mots au plus'),
    stepNumber: num("Numéro de l'étape concernée (1 = première) ; 0 si aucune"),
    confident: { type: 'boolean' },
  },
  required: ['answer', 'stepNumber', 'confident'],
}

export const standardSchema = {
  type: 'object',
  properties: {
    rules: strList('5 à 10 règles de rédaction, en mots simples'),
    startWithSafety: { type: 'boolean' },
    maxWordsPerStep: num('Nombre maximal de mots par étape, entre 10 et 60'),
    tone: { type: 'string', enum: ['tu', 'vous', 'infinitif'] },
    glossary: {
      type: 'array',
      items: { type: 'object', properties: { term: str(), meaning: str() }, required: ['term', 'meaning'] },
    },
    explanation: str('Ce que tu as retenu, en une ou deux phrases'),
  },
  required: ['rules', 'startWithSafety', 'maxWordsPerStep', 'tone', 'glossary', 'explanation'],
}

export const visualSchema = {
  type: 'object',
  properties: {
    title: str('Titre court du schéma, 2 à 6 mots'),
    html: str('La page HTML complète et autonome'),
  },
  required: ['title', 'html'],
}
