import type { shell as Fr } from '../fr/shell'

/** A héj: navigáció, menük, fiók, kódolvasó. */
export const shell: typeof Fr = {
  opening: 'A CLIP megnyitása…',
  mainNav: 'Főmenü',
  nav: {
    home: 'Kezdőlap',
    instructions: 'Utasítások',
    stations: 'Munkaállomások',
    feedback: 'Visszajelzések',
    stats: 'Statisztika',
    team: 'Csapat',
    records: 'Nyilvántartás',
    import: 'Dokumentumok importálása',
    billing: 'Csomag és kreditek',
    settings: 'Beállítások',
    more: 'Továbbiak',
  },
  newInstruction: 'Új utasítás',
  account: 'Fiókom',
  appearance: 'Megjelenés',
  signOut: 'Kijelentkezés',
  version: {
    short: (v: string) => `CLIP ${v}`,
    label: (v: string) => `${v} verzió`,
    built: (date: string) => `kiadva: ${date}`,
    app: (platform: 'ios' | 'android', v: string, build?: string) => `${platform === 'ios' ? 'iPhone' : 'Android'}-alkalmazás ${v}${build ? ` (${build})` : ''}`,
    title: 'A CLIP névjegye',
    hint: 'Az utolsó szám minden frissítéssel nő: hasonlítsa össze azzal, amelyet megadtak Önnek.',
  },
  aiConsent: {
    title: 'Az AI használata előtt',
    body: 'Az utasítások megírásához és szerkesztéséhez a CLIP a fotóit, videóit, hangjegyzeteit és szövegeit a Google és az OpenAI mesterségesintelligencia-szolgáltatásainak küldi el az Intelligence Industrielle platformon keresztül.',
    more: 'Az Ön hozzájárulása nélkül semmi sem kerül elküldésre. Visszavonhatja a Beállítások › Adatok menüben.',
    privacy: 'Adatvédelmi irányelvek',
    accept: 'Egyetértek',
    refuse: 'Most nem',
  },
  live: {
    editingElsewhere: (title: string, device: 'app' | 'web') => `Ön szerkeszti ${title ? `a(z) „${title}” utasítást` : 'egy utasítást'} ${device === 'app' ? 'a mobilalkalmazásból' : 'egy másik számítógépről'}`,
  },
  scan: {
    title: 'Kód beolvasása',
    prompt: 'Olvassa be a munkaállomás vagy az alkatrész kódját',
    failed: 'A kódolvasó nem nyílt meg',
    aim: 'Irányítsa a QR-kódra vagy vonalkódra',
    noCamera: 'A kamera nem érhető el. Engedélyezze a böngészőben, vagy írja be a kódot a keresőbe.',
  },
}
