import type { shell as Fr } from '../fr/shell'

/** De schil: navigatie, menu’s, account, codelezer. */
export const shell: typeof Fr = {
  opening: 'CLIP wordt geopend…',
  mainNav: 'Hoofdnavigatie',
  nav: {
    home: 'Start',
    instructions: 'Instructies',
    stations: 'Stations',
    feedback: 'Terugmeldingen',
    stats: 'Statistieken',
    team: 'Team',
    records: 'Register',
    import: 'Documenten importeren',
    billing: 'Abonnement en credits',
    settings: 'Instellingen',
    more: 'Meer',
  },
  newInstruction: 'Nieuwe instructie',
  account: 'Mijn account',
  appearance: 'Weergave',
  signOut: 'Uitloggen',
  version: {
    short: (v: string) => `CLIP ${v}`,
    label: (v: string) => `Versie ${v}`,
    built: (date: string) => `uitgebracht op ${date}`,
    app: (platform: 'ios' | 'android', v: string, build?: string) => `${platform === 'ios' ? 'iPhone' : 'Android'}-app ${v}${build ? ` (${build})` : ''}`,
    title: 'Over CLIP',
    hint: 'Het laatste cijfer gaat bij elke update omhoog: vergelijk het met het nummer dat je is doorgegeven.',
  },
  aiConsent: {
    title: 'Voordat je de AI gebruikt',
    body: 'Om je instructies te schrijven en te bewerken stuurt CLIP je foto’s, video’s, spraaknotities en tekst via het platform van Intelligence Industrielle naar AI-diensten van Google en OpenAI.',
    more: 'Er wordt niets verstuurd zonder jouw toestemming. Je kunt die intrekken in Instellingen › Gegevens.',
    privacy: 'Privacybeleid',
    accept: 'Ik ga akkoord',
    refuse: 'Niet nu',
  },
  live: {
    editingElsewhere: (title: string, device: 'app' | 'web') => `Je bewerkt ${title ? `“${title}”` : 'een instructie'} op ${device === 'app' ? 'de mobiele app' : 'een andere computer'}`,
  },
  scan: {
    title: 'Een code scannen',
    prompt: 'Scan de code van het station of het onderdeel',
    failed: 'De codelezer is niet geopend',
    aim: 'Richt op de QR-code of streepjescode',
    noCamera: 'De camera is niet beschikbaar. Sta hem toe in je browser, of typ de code in het zoekveld.',
  },
}
