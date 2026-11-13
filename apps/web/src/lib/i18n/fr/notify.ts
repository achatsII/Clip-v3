/** Les avertissements envoyés (courriel, téléphone), dans la langue de la personne qui les reçoit. */
export const notify = {
  review: {
    title: (instruction: string) => `À approuver : ${instruction}`,
    body: (who: string) => `${who} demande votre approbation.`,
  },
  changes: {
    title: (instruction: string) => `Changements demandés : ${instruction}`,
    body: (who: string, text: string) => `${who} demande des changements : « ${text} »`,
  },
  published: {
    title: (instruction: string) => `Publiée : ${instruction}`,
    body: 'Toutes les signatures sont là : l’instruction est au poste.',
  },
  danger: {
    title: (station: string) => `Danger signalé${station ? ` au poste ${station}` : ''}`,
    body: (instruction: string, who: string, text: string) => [instruction, who ? `par ${who}` : '', text ? `« ${text} »` : ''].filter(Boolean).join(' · '),
  },
  deviation: {
    title: (station: string) => `Écart relevé${station ? ` au poste ${station}` : ''}`,
    body: (instruction: string, who: string, text: string) => [instruction, who ? `par ${who}` : '', text].filter(Boolean).join(' · '),
  },
  request: {
    title: (who: string, what: string) => `${who} aimerait : ${what}`,
    body: (target: string) => (target ? `Pour l’ouvrir : ${target}. Tout se règle dans Abonnement et crédits.` : 'Tout se règle dans Abonnement et crédits.'),
  },
  test: {
    title: 'Essai des avertissements CLIP',
    body: 'Les avertissements arrivent bien jusqu’à vous.',
  },
  open: 'Ouvrir dans CLIP',
  footer: 'Vous recevez cet avertissement de CLIP parce que votre usine vous l’a demandé. Vous pouvez l’arrêter dans CLIP, Mon compte.',
}
