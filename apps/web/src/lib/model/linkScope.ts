/**
 * La version de la portée des liens publics. La portée elle-même se bâtit au serveur
 * (`src/lib/server/scope.ts`) ; le poste range la version de son lien (`linkVersion`), et la page du
 * poste propose « Mettre à jour le lien » quand elle est plus ancienne.
 *
 * - 1 : poste ou instruction, retours et événements.
 * - 2 : aussi la liste des personnes de l'équipe (lecture), le travail fait (`clip_execution`) et
 *   les réponses de formation (`clip_training`) en écriture.
 */
export const LINK_SCOPE_VERSION = 2
