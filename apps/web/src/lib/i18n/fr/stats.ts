/**
 * Un nombre entier du dossier imprimé. fr-CA sépare les milliers par une espace fine insécable,
 * que la police serrée du dossier efface : une espace insécable ordinaire.
 */
const whole = (n: number) => Math.round(n).toLocaleString('fr-CA').replace(/\u202f/g, '\u00a0')

/** Les statistiques et le dossier pour la direction. */
export const stats = {
  /** La page Statistiques. */
  page: {
    title: 'Statistiques',
    subtitle: (days: number) => `Les ${days.toLocaleString('fr-CA')} derniers jours : ce qui est consulté au plancher, ce qui est signalé, ce que ça vous fait gagner.`,
    views: 'Consultations',
    viewsHint: (kiosk: number, link: number, app: number) => `Tablettes ${kiosk.toLocaleString('fr-CA')} · liens ${link.toLocaleString('fr-CA')} · app ${app.toLocaleString('fr-CA')}`,
    completions: 'Réalisations',
    completionsHint: (rate: number) => `${rate.toLocaleString('fr-CA')} % des consultations vont au bout`,
    feedback: 'Retours',
    feedbackHint: (done: number) => `${done.toLocaleString('fr-CA')} traités`,
    value: 'Valeur estimée',
    /** La valeur estimée, en dollars. */
    money: (n: number) => `${n.toLocaleString('fr-CA')} $`,
    valueLocked: 'Retour sur investissement : plan supérieur',
    valueHint: (hours: number) => `${hours.toLocaleString('fr-CA')} h gagnées · touchez pour vos hypothèses`,
    chartTitle: 'Consultations par jour',
    chartUnit: 'consultations',
    top: 'Les plus consultées',
    topEmpty: 'Les consultations apparaîtront dès que les opérateurs ouvriront les instructions (tablette, code QR, lien).',
    watch: 'À regarder de plus près',
    unseen: (n: number) => {
      const s = n > 1 ? 's' : ''
      return `${n.toLocaleString('fr-CA')} instruction${s} publiée${s} jamais consultée${s} : est-elle au bon poste ?`
    },
    allSeen: 'Toutes les instructions publiées ont été consultées.',
    openFeedback: (n: number) => `${n.toLocaleString('fr-CA')} retour(s) à traiter.`,
    aiUse: (generations: number, imports: number) =>
      `${generations.toLocaleString('fr-CA')} génération${generations > 1 ? 's' : ''} et ${imports.toLocaleString('fr-CA')} import${imports > 1 ? 's' : ''} par l’IA ce mois-ci.`,
    medianDuration: (minutes: number) => `Une réalisation prend ${minutes.toLocaleString('fr-CA')} min en médiane.`,
  },
  /** La fenêtre « Comment on calcule la valeur » et les hypothèses de l'usine. */
  roi: {
    title: 'Comment on calcule la valeur',
    intro: 'Une estimation transparente, selon vos hypothèses : le temps gagné à rédiger chaque instruction créée, et le temps gagné à chaque réalisation guidée (moins de questions, moins d’erreurs).',
    hoursPerInstruction: 'Heures gagnées par instruction',
    minutesPerCompletion: 'Minutes par réalisation',
    hourlyRate: 'Taux horaire ($)',
    save: 'Enregistrer mes hypothèses',
    /** Le calcul, en toutes lettres. */
    formula: (f: { created: number; hoursPerInstruction: number; completions: number; minutesPerCompletion: number; hours: number; hourlyRate: number; value: number }) =>
      `${f.created.toLocaleString('fr-CA')} instruction${f.created > 1 ? 's' : ''} × ${f.hoursPerInstruction.toLocaleString('fr-CA')} h + ${f.completions.toLocaleString('fr-CA')} réalisations × ${f.minutesPerCompletion.toLocaleString('fr-CA')} min = ${f.hours.toLocaleString('fr-CA')} h × ${f.hourlyRate.toLocaleString('fr-CA')} $ = ${f.value.toLocaleString('fr-CA')} $`,
  },
  /** Le graphique des consultations par jour. */
  chart: {
    total: (total: number, unit: string, days: number) => `${total.toLocaleString('fr-CA')} ${unit} sur ${days.toLocaleString('fr-CA')} jours`,
    showChart: 'Voir le graphique',
    showTable: 'Voir le tableau',
    day: 'Jour',
    bar: (date: string, value: number, unit: string) => `${date} : ${value.toLocaleString('fr-CA')} ${unit}`,
    empty: 'Rien encore sur cette période : les barres apparaîtront à la première consultation.',
  },
  /** La page du dossier pour la direction (aperçu, impression, plan proposé). */
  report: {
    title: 'Dossier pour la direction',
    unavailableTitle: 'Le dossier n’est pas offert ici',
    unavailableDescription: 'Les chiffres restent dans la page Statistiques.',
    backToStats: 'Retour aux statistiques',
    lockedTitle: 'Le dossier fait partie des statistiques d’adoption',
    lockedDescription: 'Montrez à la direction le temps gagné et sa valeur : la fonction s’ouvre avec un plan qui l’inclut.',
    seePlan: 'Voir le plan qui l’inclut',
    hint: 'Dossier pour la direction — choisissez « Enregistrer en PDF » pour l’envoyer.',
    print: 'Imprimer ou enregistrer en PDF',
    printShort: 'PDF',
    propose: 'Proposer',
    noPlan: 'Aucun plan',
    preview: 'Aperçu du dossier',
  },
  /** Le dossier imprimé lui-même. */
  pdf: {
    docTitle: (org: string) => `Bilan CLIP — ${org}`,
    eyebrow: (org: string) => `Bilan CLIP · ${org}`,
    headline: (days: number) => `Ce que CLIP vous a fait gagner en ${days.toLocaleString('fr-CA')} jours`,
    period: (from: string, to: string) => `Du ${from} au ${to}`,
    /** Un nombre du dossier, sans décimales. */
    number: (n: number) => whole(n),
    money: (n: number) => `${whole(n)} $`,
    leadEyebrow: 'Valeur estimée, selon vos hypothèses',
    hoursSaved: (hours: number) => `${whole(hours)} ${Math.abs(Math.round(hours)) > 1 ? 'heures gagnées' : 'heure gagnée'} à rédiger et à guider les tâches au poste`,
    views: 'Consultations au plancher',
    viewsHint: (rate: number) => `${rate.toLocaleString('fr-CA')} % vont jusqu’au bout`,
    completions: 'Réalisations guidées',
    completionsHint: 'tâches faites avec l’instruction sous les yeux',
    created: 'Instructions rédigées',
    createdHint: (published: number) => `${whole(published)} ${Math.abs(published) > 1 ? 'publiées' : 'publiée'} au total`,
    stations: 'Postes équipés',
    stationsHint: 'postes qui ont leurs instructions',
    top: 'Les plus consultées',
    topEmpty: 'Les consultations apparaîtront dès que les opérateurs ouvriront les instructions.',
    watch: 'À surveiller',
    feedback: (total: number, done: number) =>
      `${whole(total)} ${Math.abs(total) > 1 ? 'retours signalés' : 'retour signalé'} par les opérateurs, ${whole(done)} ${Math.abs(done) > 1 ? 'traités' : 'traité'}`,
    unseen: (n: number) => `${whole(n)} ${Math.abs(n) > 1 ? 'instructions publiées jamais consultées' : 'instruction publiée jamais consultée'} : à placer au bon poste`,
    allSeen: 'Toutes les instructions publiées ont été consultées',
    next: 'Pour la suite',
    upgrade: (plan: string) => `Passer au plan ${plan}`,
    /** Où l'on en est des limites, déjà mis en mots. */
    today: (usage: string) => `Aujourd’hui : ${usage}.`,
    perMonth: (price: string) => `${price} / mois`,
    perYear: (price: string) => `${price} / an`,
    orYearly: (price: string) => `ou ${price}`,
    ratio: (days: number, ratio: number) =>
      `La valeur estimée de ces ${days.toLocaleString('fr-CA')} jours représente ${ratio.toLocaleString('fr-CA', { maximumFractionDigits: 1 })} fois le prix mensuel du plan.`,
    footer: (hoursPerInstruction: number, minutesPerCompletion: number, hourlyRate: number, date: string) =>
      `Estimation transparente, selon les hypothèses de l’usine : ${hoursPerInstruction.toLocaleString('fr-CA')} h gagnées par instruction rédigée, ${minutesPerCompletion.toLocaleString('fr-CA')} min par réalisation guidée, ${hourlyRate.toLocaleString('fr-CA')} $ de l’heure. Elles se modifient dans CLIP, page Statistiques. Document préparé le ${date}.`,
  },
}
