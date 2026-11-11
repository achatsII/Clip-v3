/**
 * Le contrat du pont, partagé avec l'app web. La source est `packages/bridge` ; la coquille en
 * garde une copie synchronisée (`contract.ts`, `npm run sync-bridge`) pour rester autonome.
 * Un seul point d'import : le reste de la coquille importe d'ici.
 */
export * from './contract'
