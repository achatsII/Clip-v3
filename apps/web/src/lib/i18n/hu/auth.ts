import type { auth as Fr } from '../fr/auth'

/** Bejelentkezés, regisztráció, elfelejtett jelszó, üdvözlés; a munkamenet megnyitása és a natív héj. */
export const auth: typeof Fr = {
  login: {
    tagline: 'Munkautasítások',
    hero: {
      film: 'Filmezze le.',
      aiWrites: 'Az AI megírja.',
      floorFollows: 'A műhely követi.',
      pitch: 'Perceken belül kész egy világos, szemléletes munkautasítás, amelyet minden operátor a megfelelő munkaállomáson talál meg, fiók nélkül.',
      inputs: 'Videók, fotók, hangjegyzetek vagy régi PDF-ek',
      generated: 'Generált lépések, videórészletek és figyelmeztetések',
      qrAndTablet: 'QR-kód és munkaállomási táblagép, fiók nélkül',
    },
    titles: { login: 'Üdv újra', signup: 'Fiók létrehozása', forgot: 'Jelszó visszaállítása' },
    intros: {
      login: 'Jelentkezzen be az utasítások létrehozásához és kezeléséhez.',
      signup: 'Ingyenes kezdés. Bankkártya nélkül.',
      forgot: 'Küldünk egy hivatkozást az új jelszó megadásához.',
    },
    sent: {
      title: 'E-mail elküldve',
      body: (email: string) => `Ha létezik fiók a(z) ${email} címen, néhány percen belül megérkezik a hivatkozás.`,
      back: 'Vissza a bejelentkezéshez',
    },
    fullname: 'Név',
    fullnamePlaceholder: 'Kovács Anna',
    company: 'Üzem vagy cég',
    optional: 'nem kötelező',
    companyPlaceholder: 'Győri üzem',
    email: 'E-mail',
    emailPlaceholder: 'nev@cegnev.hu',
    password: 'Jelszó',
    forgotLink: 'Elfelejtette?',
    submit: { login: 'Bejelentkezés', signup: 'Fiók létrehozása', forgot: 'Hivatkozás küldése' },
    /** Az AI-hozzájárulás, amelyet a bejelentkezés ad meg (az Apple 5.1.2(i) szabálya). */
    aiNotice: {
      login: 'A bejelentkezéssel hozzájárul ahhoz, hogy a Google AI elemezze fotóit, videóit, hangjegyzeteit és szövegeit, és hogy az OpenAI megkapjon egy fotót, ha képet kér.',
      signup: 'A fiók létrehozásával hozzájárul ahhoz, hogy a Google AI elemezze fotóit, videóit, hangjegyzeteit és szövegeit, és hogy az OpenAI megkapjon egy fotót, ha képet kér.',
    },
    privacy: 'Adatvédelmi irányelvek',
    errors: {
      email: 'Adjon meg érvényes e-mail-címet.',
      passwordTooShort: 'A jelszó legalább 8 karakter legyen.',
      passwordMissing: 'Adja meg a jelszót.',
    },
    newHere: 'Új felhasználó?',
    createFreeAccount: 'Ingyenes fiók létrehozása',
    askForInvitation: 'Még nincs fiókja? Kérjen meghívót az adminisztrátortól.',
    haveAccount: 'Már van fiókom',
    language: 'Nyelv',
  },
  welcome: {
    setup: 'Beállítás',
    progress: (step: number, total: number) => `${step.toLocaleString('hu-HU')} / ${total.toLocaleString('hu-HU')}`,
    name: {
      title: 'Mi az üzem neve?',
      hint: 'Megjelenik a munkaállomási táblagépeken és a PDF-eken.',
      placeholder: 'Győri üzem',
    },
    goals: {
      title: 'Mit szeretne először dokumentálni?',
      hint: 'Annyit választhat, amennyit szeretne. A kezdőlap ezek köré szerveződik.',
      sstAndLockout: 'Munkavédelem és LOTO',
    },
    approval: {
      title: 'Ki hagyja jóvá az utasításokat?',
      hint: 'A beállításokban bármikor megváltoztatható.',
      none: 'Senki: közvetlen közzététel',
      noneHint: 'Aki megírja, az felel érte.',
      one: 'Előbb egy jóváhagyó ellenőrzi',
      oneHint: 'Felügyelő, minőségügy vagy munkavédelem: látja, mi változott, és közzéteszi.',
    },
    ready: {
      title: (plant: string) => `Minden kész, ${plant}!`,
      hint: 'Az első utasítás néhány perc: filmezzen le valakit munka közben, miközben magyarázza, mit csinál.',
      create: 'Az első utasításom létrehozása',
      import: 'Régi PDF-jeim importálása',
      later: 'Később',
    },
    finish: 'Befejezés',
    nothingPublished: 'Az Ön jóváhagyása nélkül semmi sem kerül közzétételre.',
  },
  session: {
    defaultOrgName: 'Az én üzemem',
    me: 'Én',
    openFailed: 'A CLIP nem nyitható meg',
    serverDown: 'A szerver most nem válaszol. Ellenőrizze a kapcsolatot, majd próbálja újra.',
  },
  native: {
    unavailable: 'A natív funkció nem érhető el',
    noResponse: 'A mobilalkalmazás nem válaszol',
  },
}
