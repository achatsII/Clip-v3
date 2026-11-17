import type { home as Fr } from '../fr/home'

/** A kezdőlap. */
export const home: typeof Fr = {
  greeting: {
    night: (name: string) => `Üdv, ${name}`,
    morning: (name: string) => `Jó reggelt, ${name}`,
    afternoon: (name: string) => `Jó napot, ${name}`,
    evening: (name: string) => `Jó estét, ${name}`,
  },
  hero: {
    eyebrow: 'Új utasítás',
    line1: 'Filmezze. Mondja el.',
    line2: 'Az AI megírja.',
    video: 'Videó',
    voiceNote: 'Hangjegyzet',
    document: 'PDF vagy Word',
  },
  reader: {
    find: 'Utasítás keresése',
    myStations: 'Munkaállomásaim',
  },
  setup: {
    title: 'Indítsa be az üzemet',
    hint: 'Néhány perc, lépésről lépésre.',
    publish: 'Az első utasítás közzététele',
    station: 'Munkaállomás és QR-kódja létrehozása',
    logo: 'Az üzem logójának hozzáadása',
    invite: 'Munkatárs meghívása',
    standard: 'Az írási szabvány beállítása',
    hide: 'A beállítás elrejtése',
    hideShort: 'Elrejtés',
    show: 'Mutatás',
    compact: (done: number, total: number) => `Beállítás: ${done} / ${total}`,
  },
  tiles: {
    published: 'Közzétéve',
    coverage: (percent: number) => `A munkaállomások ${percent.toLocaleString('hu-HU')}%-a lefedve`,
    noStation: 'Még nincs munkaállomás',
    views: 'Megtekintések · 7 nap',
    viewsHint: 'Táblagépek, QR-kódok és hivatkozások',
    stations: 'Munkaállomások',
    stationsHint: 'Az utasításaikkal',
    streak: 'Sorozat',
    streakWeeks: (weeks: number) => 'hét egymás után közzététellel',
    streakStart: 'Tegyen közzé valamit ezen a héten a sorozat elindításához',
  },
  renewal: {
    title: (count: number) => `Felülvizsgálandó (${count.toLocaleString('hu-HU')})`,
    hint: 'Közeleg a felülvizsgálatuk időpontja. Nem változott semmi? Erősítse meg egy érintéssel.',
  },
  review: {
    title: (count: number) => `Jóváhagyandó (${count.toLocaleString('hu-HU')})`,
    hint: 'A módosított lépések jelölve vannak a szerkesztőben.',
  },
  feedback: {
    title: 'Operátori visszajelzések',
    seeAll: 'Mind megtekintése',
    quote: (comment: string) => `„${comment}”`,
    when: (step: number | null, ago: string) => (step === null ? ago : `${step.toLocaleString('hu-HU')}. lépés · ${ago}`),
    none: 'Nincs új visszajelzés.',
  },
  drafts: { title: 'Folytassa ott, ahol abbahagyta', hint: 'A folyamatban lévő piszkozatai' },
  forYou: { title: 'Önnek', hint: 'A feladatköre alapján' },
  library: {
    count: (n: number) => `${n.toLocaleString('hu-HU')} közzétett utasítás`,
    hint: 'A műhelynek élő könyvtára van. Tartsa naprakészen az operátorok visszajelzéseivel.',
  },
}
