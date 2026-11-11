/** L’import en lot des anciens documents. */
export const importer = {
  title: 'Importer vos anciennes instructions',
  subtitle: 'Déposez vos PDF et documents Word, même par dizaines : chacun devient un brouillon structuré, prêt à relire.',
  readOnly: 'Votre rôle ne permet pas d’importer.',
  unavailableTitle: 'Import en lot indisponible pour le moment',
  unavailableText: 'Vous pouvez déposer un document dans une nouvelle instruction.',
  /** La zone de dépôt. Le coût d'un document court (« · 60 crédits ») s'insère entre `before` et `after`. */
  drop: {
    title: 'Glissez vos fichiers ici, ou touchez pour les choisir',
    before: 'PDF, Word (.docx, .doc, .odt) ·',
    after: 'par document court',
  },
  onlyDocuments: 'Seuls les PDF et les documents Word sont importés ici',
  onlyDocumentsText: 'Les vidéos et photos se déposent dans une nouvelle instruction.',
  /** Le lot en cours. */
  batch: {
    progress: (done: number, total: number) => `${done.toLocaleString('fr-CA')} sur ${total.toLocaleString('fr-CA')} terminé${done > 1 ? 's' : ''}`,
    resume: (pending: number) => `Reprendre l’analyse (${pending.toLocaleString('fr-CA')})`,
    running: 'En cours — gardez cet onglet ouvert',
    review: 'Relire',
  },
  /** L'état de chaque document du lot. */
  status: {
    waiting: 'En attente',
    uploading: 'Envoi et conversion…',
    uploaded: 'Prêt à analyser',
    analyzing: 'L’IA restructure…',
    done: 'Brouillon créé',
    error: 'Échec',
  },
  errors: {
    interrupted: 'Envoi interrompu : redéposez le fichier.',
    upload: 'Envoi impossible',
    analysis: 'Analyse impossible',
  },
}
