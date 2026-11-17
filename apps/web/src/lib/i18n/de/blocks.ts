import type { blocks as Fr } from '../fr/blocks'

const num = (n: number) => n.toLocaleString('de-DE')
const plural = (n: number, one: string, many: string) => (n === 1 ? one : many)

export const blocks: typeof Fr = {
  make: 'Gemeinsamen Baustein erstellen',
  insert: 'Gemeinsamen Baustein einfügen',
  makeIntro: 'Die gewählten Schritte werden zu einem Baustein: einmal geschrieben, in anderen Anweisungen wiederverwendet und überall aktualisiert.',
  name: 'Name des Bausteins',
  namePlaceholder: 'Presse P-12 freischalten',
  pick: 'Die Schritte des Bausteins',
  makeConfirm: 'Baustein erstellen',
  made: (title: string) => `Baustein „${title}“ erstellt`,
  madeHint: 'Seine Schritte werden jetzt im Baustein bearbeitet.',
  makeFailed: 'Der Baustein wurde nicht erstellt',
  search: 'Baustein suchen',
  empty: 'Noch kein gemeinsamer Baustein',
  emptyHint: 'Erstellen Sie einen aus den Schritten einer Anweisung (Menü „…“).',
  already: 'Bereits in dieser Anweisung',
  inserted: (title: string) => `Baustein „${title}“ eingefügt`,
  insertFailed: 'Der Baustein wurde nicht eingefügt',
  steps: (n: number) => `${num(n)} ${plural(n, 'Schritt', 'Schritte')}`,
  stepNotice: (title: string, version: number) => `Schritt aus dem gemeinsamen Baustein „${title}“ (v${num(version)}): Er wird im Baustein bearbeitet, überall zugleich.`,
  more: 'Weitere Aktionen für den Baustein',
  open: 'Baustein öffnen',
  detach: 'Lösen',
  detachConfirm: { title: 'Diese Schritte vom Baustein lösen?', description: 'Sie werden zu eigenen Schritten dieser Anweisung: Sie können sie hier bearbeiten, sie folgen dem Baustein aber nicht mehr.', confirm: 'Lösen' },
  remove: 'Baustein entfernen',
  removeConfirm: { title: 'Den Baustein aus dieser Anweisung entfernen?', description: 'Seine Schritte verlassen diese Anweisung; der Baustein bleibt für die anderen bestehen.', confirm: 'Entfernen' },
  thumb: 'Baustein',
  chip: 'Gemeinsamer Baustein',
  editing: (n: number) => (n ? `Gemeinsamer Baustein, verwendet in ${num(n)} ${plural(n, 'Anweisung', 'Anweisungen')}: Das Veröffentlichen aktualisiert sie.` : 'Gemeinsamer Baustein: Er steckt noch in keiner Anweisung. Fügen Sie ihn in einer Anweisung ein, Menü „…“.'),
  info: 'Titel und Details',
  infoOpen: 'Titel und Details bearbeiten',
  infoTitle: 'Details des Bausteins',
  summaryPlaceholder: 'Wofür dieser Baustein dient, in einem Satz',
  archiveDescription: (n: number) =>
    n === 0
      ? 'Er verschwindet aus der Liste der Bausteine. Seine Versionen bleiben erhalten.'
      : n === 1
        ? 'Die Anweisung, die ihn verwendet, behält seine Schritte unverändert; um sie zu ändern, lösen Sie sie dort.'
        : `Die ${num(n)} Anweisungen, die ihn verwenden, behalten seine Schritte unverändert; um sie zu ändern, lösen Sie sie in jeder einzelnen.`,
  archived: 'Baustein archiviert',
  publishImpact: (n: number) => (n ? `Das Veröffentlichen aktualisiert ${num(n)} ${plural(n, 'Anweisung', 'Anweisungen')}: Aktuelle werden neu veröffentlicht, die anderen erhalten den Baustein in ihrem Entwurf.` : 'Noch keine Anweisung verwendet ihn: Fügen Sie ihn in einer Anweisung ein, Menü „…“.'),
  propagating: (done: number, total: number) => `Anweisungen werden aktualisiert … ${num(done)} von ${num(total)}`,
  propagated: (republished: number, drafts: number) =>
    [republished ? `${num(republished)} ${plural(republished, 'Anweisung neu veröffentlicht', 'Anweisungen neu veröffentlicht')}` : '', drafts ? `${num(drafts)} ${plural(drafts, 'Entwurf aktualisiert', 'Entwürfe aktualisiert')}` : ''].filter(Boolean).join(' · ') || 'Keine Anweisung zu aktualisieren',
  propagateFailed: (n: number) => `${num(n)} ${plural(n, 'Anweisung wurde', 'Anweisungen wurden')} nicht aktualisiert: Veröffentlichen Sie den Baustein erneut, um es noch einmal zu versuchen.`,
  filter: 'Gemeinsame Bausteine',
  newBlock: 'Neuer Baustein',
  newTitle: 'Neuer gemeinsamer Baustein',
  total: (n: number) => (n > 1 ? `${num(n)} gemeinsame Bausteine` : n === 1 ? '1 gemeinsamer Baustein' : 'Kein gemeinsamer Baustein'),
  emptyList: 'Die Schritte, die überall wiederkehren (Freischaltung, Anfahren, PSA): einmal geschrieben, in jeder Anweisung aktuell. Erstellen Sie hier einen oder aus den Schritten einer Anweisung (Menü „…“).',
  changelog: (title: string, version: number) => `Gemeinsamer Baustein „${title}“ v${num(version)}.`,
  errors: {
    noSteps: 'Wählen Sie mindestens einen Schritt.',
    locked: (title: string) => `Dieser Schritt stammt aus dem gemeinsamen Baustein „${title}“: Er wird im Baustein bearbeitet.`,
  },
}
