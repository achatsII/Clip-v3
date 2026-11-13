import type { shell as Fr } from '../fr/shell'

/** La coquille : navigation, menus, compte, lecteur de code. */
export const shell: typeof Fr = {
  opening: 'Opening CLIP…',
  mainNav: 'Main navigation',
  nav: {
    home: 'Home',
    instructions: 'Instructions',
    stations: 'Stations',
    feedback: 'Feedback',
    stats: 'Statistics',
    team: 'Team',
    import: 'Import documents',
    billing: 'Plan and credits',
    settings: 'Settings',
    more: 'More',
  },
  newInstruction: 'New instruction',
  account: 'My account',
  appearance: 'Appearance',
  signOut: 'Sign out',
  aiConsent: {
    title: 'Before using AI',
    body: 'To write and edit your instructions, CLIP sends your photos, videos, voice notes and text to artificial intelligence services from Google and OpenAI, through the Intelligence Industrielle platform.',
    more: 'Nothing is sent without your consent. You can withdraw it in Settings › Data.',
    privacy: 'Privacy policy',
    accept: 'I agree',
    refuse: 'Not now',
  },
  live: {
    editingElsewhere: (title: string, device: 'app' | 'web') => `You’re editing ${title ? `“${title}”` : 'an instruction'} from ${device === 'app' ? 'the mobile app' : 'another computer'}`,
  },
  scan: {
    title: 'Scan a code',
    prompt: 'Scan the station or part code',
    failed: 'The code reader didn’t open',
    aim: 'Aim at the QR code or barcode',
    noCamera: 'The camera isn’t available. Allow it in your browser, or type the code in the search.',
  },
}
