import type { blocks as Fr } from '../fr/blocks'

const num = (n: number) => n.toLocaleString('hu-HU')

export const blocks: typeof Fr = {
  make: 'Közös blokk létrehozása',
  insert: 'Közös blokk beszúrása',
  makeIntro: 'A kijelölt lépések blokkot alkotnak: egyszer megírva más utasításokban is felhasználhatók, és mindenhol frissülnek.',
  name: 'A blokk neve',
  namePlaceholder: 'P-12 prés LOTO',
  pick: 'A blokk lépései',
  makeConfirm: 'Blokk létrehozása',
  made: (title: string) => `„${title}” blokk létrehozva`,
  madeHint: 'A lépései mostantól a blokkban szerkeszthetők.',
  makeFailed: 'A blokk nem jött létre',
  search: 'Blokk keresése',
  empty: 'Még nincs közös blokk',
  emptyHint: 'Hozzon létre egyet egy utasítás lépéseiből („…” menü).',
  already: 'Már szerepel ebben az utasításban',
  inserted: (title: string) => `„${title}” blokk beszúrva`,
  insertFailed: 'A blokk nem lett beszúrva',
  steps: (n: number) => `${num(n)} lépés`,
  stepNotice: (title: string, version: number) => `Lépés a(z) „${title}” közös blokkból (v${num(version)}): a blokkban szerkeszthető, mindenhol egyszerre.`,
  more: 'További blokkműveletek',
  open: 'Blokk megnyitása',
  detach: 'Leválasztás',
  detachConfirm: { title: 'Leválasztja ezeket a lépéseket a blokkról?', description: 'Ennek az utasításnak a saját lépései lesznek: itt szerkeszthetők, de már nem követik a blokkot.', confirm: 'Leválasztás' },
  remove: 'Blokk eltávolítása',
  removeConfirm: { title: 'Eltávolítja a blokkot ebből az utasításból?', description: 'A lépései kikerülnek ebből az utasításból; a blokk a többiben megmarad.', confirm: 'Eltávolítás' },
  thumb: 'Blokk',
  chip: 'Közös blokk',
  editing: (n: number) => (n ? `Közös blokk, ${num(n)} utasításban használatos: a közzététele frissíti őket.` : 'Közös blokk: még egyetlen utasításban sem szerepel. Szúrja be egy utasításból, „…” menü.'),
  info: 'Cím és részletek',
  infoOpen: 'Cím és részletek szerkesztése',
  infoTitle: 'A blokk részletei',
  summaryPlaceholder: 'Mire való ez a blokk, egy mondatban',
  archiveDescription: (n: number) =>
    n === 0
      ? 'Kikerül a blokkok listájából. A verziói megmaradnak.'
      : n === 1
        ? 'Az utasítás, amely használja, megtartja a lépéseit; módosításukhoz ott le kell választani őket.'
        : `A ${num(n)} utasítás, amely használja, megtartja a lépéseit; módosításukhoz mindegyikben le kell választani őket.`,
  archived: 'Blokk archiválva',
  publishImpact: (n: number) => (n ? `A közzététel ${num(n)} utasítást frissít: a naprakészeket újra közzéteszi, a többiek piszkozatába beteszi a blokkot.` : 'Még egyetlen utasítás sem használja: szúrja be egy utasításba, „…” menü.'),
  propagating: (done: number, total: number) => `Utasítások frissítése… ${num(done)} / ${num(total)}`,
  propagated: (republished: number, drafts: number) =>
    [republished ? `${num(republished)} utasítás újra közzétéve` : '', drafts ? `${num(drafts)} piszkozat frissítve` : ''].filter(Boolean).join(' · ') || 'Nincs frissítendő utasítás',
  propagateFailed: (n: number) => `${num(n)} utasítás nem frissült: tegye közzé újra a blokkot az újrapróbálkozáshoz.`,
  filter: 'Közös blokkok',
  newBlock: 'Új blokk',
  newTitle: 'Új közös blokk',
  total: (n: number) => (n ? `${num(n)} közös blokk` : 'Nincs közös blokk'),
  emptyList: 'Azok a lépések, amelyek mindenhol visszatérnek (LOTO, indítás, egyéni védőeszközök): egyszer megírva, minden utasításban naprakészen. Hozzon létre egyet itt, vagy egy utasítás lépéseiből („…” menü).',
  changelog: (title: string, version: number) => `„${title}” közös blokk, v${num(version)}.`,
  errors: {
    noSteps: 'Válasszon legalább egy lépést.',
    locked: (title: string) => `Ez a lépés a(z) „${title}” közös blokkból származik: a blokkban szerkeszthető.`,
  },
}
