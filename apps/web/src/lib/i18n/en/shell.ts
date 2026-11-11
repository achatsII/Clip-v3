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
    import: 'Import documents',
    billing: 'Plan and credits',
    settings: 'Settings',
    more: 'More',
  },
  newInstruction: 'New instruction',
  account: 'My account',
  appearance: 'Appearance',
  signOut: 'Sign out',
  scan: {
    title: 'Scan a code',
    prompt: 'Scan the station or part code',
    failed: 'The code reader didn’t open',
    aim: 'Aim at the QR code or barcode',
    noCamera: 'The camera isn’t available. Allow it in your browser, or type the code in the search.',
  },
}
