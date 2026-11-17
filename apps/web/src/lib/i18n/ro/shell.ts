import type { shell as Fr } from '../fr/shell'

/** La coquille : navigation, menus, compte, lecteur de code. */
export const shell: typeof Fr = {
  opening: 'Se deschide CLIP…',
  mainNav: 'Navigare principală',
  nav: {
    home: 'Acasă',
    instructions: 'Instrucțiuni',
    stations: 'Posturi',
    feedback: 'Reacții',
    stats: 'Statistici',
    team: 'Echipă',
    records: 'Registru',
    import: 'Importă documente',
    billing: 'Plan și credite',
    settings: 'Setări',
    more: 'Mai mult',
  },
  newInstruction: 'Instrucțiune nouă',
  account: 'Contul meu',
  appearance: 'Aspect',
  signOut: 'Deconectare',
  version: {
    short: (v: string) => `CLIP ${v}`,
    label: (v: string) => `Versiunea ${v}`,
    built: (date: string) => `lansată la ${date}`,
    app: (platform: 'ios' | 'android', v: string, build?: string) => `Aplicația ${platform === 'ios' ? 'iPhone' : 'Android'} ${v}${build ? ` (${build})` : ''}`,
    title: 'Despre CLIP',
    hint: 'Ultimul număr crește la fiecare actualizare: comparați-l cu cel care vi s-a comunicat.',
  },
  aiConsent: {
    title: 'Înainte de a folosi AI',
    body: 'Pentru a redacta și edita instrucțiunile dumneavoastră, CLIP trimite fotografiile, videoclipurile, notele vocale și textul către servicii de inteligență artificială de la Google și OpenAI, prin platforma Intelligence Industrielle.',
    more: 'Nimic nu se trimite fără acordul dumneavoastră. Îl puteți retrage în Setări › Date.',
    privacy: 'Politica de confidențialitate',
    accept: 'Sunt de acord',
    refuse: 'Nu acum',
  },
  live: {
    editingElsewhere: (title: string, device: 'app' | 'web') => `Editați ${title ? `„${title}”` : 'o instrucțiune'} ${device === 'app' ? 'din aplicația mobilă' : 'de pe un alt computer'}`,
  },
  scan: {
    title: 'Scanați un cod',
    prompt: 'Scanați codul postului sau al piesei',
    failed: 'Cititorul de coduri nu s-a deschis',
    aim: 'Îndreptați camera spre codul QR sau codul de bare',
    noCamera: 'Camera nu este disponibilă. Permiteți-o în browser sau tastați codul în căutare.',
  },
}
