import type { settings as Fr } from '../fr/settings'

/** Les réglages : usine, standard, approbation, membres, apparence, données. */
export const settings: typeof Fr = {
  appearance: {
    title: 'Appearance',
    language: 'Language',
    languageNote: 'Instructions keep their language; new ones are written in this one.',
    display: 'Display',
    light: 'Light',
    dark: 'Dark',
    system: 'System',
    color: 'Interface color',
    brandColorNote: 'With “Ocean”, your plant’s color replaces the blue.',
    mobileNote: 'On the floor, the CLIP mobile app films in 720p and shrinks photos: light media, sent even if the network drops for a moment.',
  },
}
