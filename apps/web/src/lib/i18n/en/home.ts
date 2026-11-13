import type { home as Fr } from '../fr/home'

/** L’accueil. */
export const home: typeof Fr = {
  greeting: {
    night: (name: string) => `Hello, ${name}`,
    morning: (name: string) => `Good morning, ${name}`,
    afternoon: (name: string) => `Good afternoon, ${name}`,
    evening: (name: string) => `Good evening, ${name}`,
  },
  hero: {
    eyebrow: 'New instruction',
    line1: 'Film it. Say it.',
    line2: 'AI writes it.',
    video: 'Video',
    voiceNote: 'Voice note',
    document: 'PDF or Word',
  },
  reader: {
    find: 'Find an instruction',
    myStations: 'My stations',
  },
  setup: {
    title: 'Get your plant up and running',
    hint: 'A few minutes, one step at a time.',
    publish: 'Publish a first instruction',
    station: 'Create a station and its QR code',
    logo: 'Add the plant’s logo',
    invite: 'Invite a coworker',
    standard: 'Adjust your writing standard',
    hide: 'Hide the setup',
    hideShort: 'Hide',
    show: 'Show',
    compact: (done: number, total: number) => `Setup: ${done} of ${total}`,
  },
  tiles: {
    published: 'Published',
    coverage: (percent: number) => `${percent.toLocaleString('en-CA')}% of stations covered`,
    noStation: 'No stations yet',
    views: 'Views · 7 days',
    viewsHint: 'Tablets, QR codes and links',
    stations: 'Stations',
    stationsHint: 'With their instructions',
    streak: 'Streak',
    streakWeeks: (weeks: number) => `week${weeks !== 1 ? 's' : ''} in a row with something published`,
    streakStart: 'Publish this week to start your streak',
  },
  renewal: {
    title: (count: number) => `To review (${count.toLocaleString('en-CA')})`,
    hint: 'They’re reaching their review date. Nothing changed? Confirm it in one tap.',
  },
  review: {
    title: (count: number) => `To approve (${count.toLocaleString('en-CA')})`,
    hint: 'Changed steps are marked in the editor.',
  },
  feedback: {
    title: 'Operator feedback',
    seeAll: 'See all',
    quote: (comment: string) => `“${comment}”`,
    when: (step: number | null, ago: string) => (step === null ? ago : `Step ${step.toLocaleString('en-CA')} · ${ago}`),
    none: 'No new feedback.',
  },
  drafts: { title: 'Jump back in', hint: 'Your drafts in progress' },
  forYou: { title: 'For you', hint: 'Based on your responsibilities' },
  library: {
    count: (n: number) => `${n.toLocaleString('en-CA')} published instruction${n !== 1 ? 's' : ''}`,
    hint: 'Your floor has a living library. Keep it up to date with operator feedback.',
  },
}
