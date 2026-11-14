/**
 * L'interrupteur et la configuration de l'espace Découvrir, lus dans les variables du serveur (jamais en
 * `NEXT_PUBLIC_*` pour Sandboxes). Les pages de l'espace lisent le mode au build (elles sont statiques) ;
 * l'intercepteur (`src/proxy.ts`) et les routes `/api/decouvrir/*`, à l'exécution : changer
 * `DECOUVRIR_ACCES`, c'est redéployer.
 */
import type { AccessMode } from '../contract'

type Env = Record<string, string | undefined>

/** `DECOUVRIR_ACCES` : `sandboxes` (même avec des espaces ou des majuscules) ferme l'espace ; absent, `ouvert` ou autre chose : ouvert. */
export function accessMode(env: Env = process.env): AccessMode {
  return (env.DECOUVRIR_ACCES ?? '').trim().toLowerCase() === 'sandboxes' ? 'sandboxes' : 'ouvert'
}

export interface DecouvrirConfig {
  /** La passerelle de la connexion à l'espace (celle des comptes des prospects). */
  gateway: string
  /**
   * L'application de Clip à la passerelle, pour reconnaître un client ; null tant que Clip se connecte par
   * l'application partagée `html`, qui ne dit pas « client de Clip » : l'étape est alors sautée, et un client
   * qui veut voir l'espace reçoit un accès dans Sandboxes, comme un prospect. Le jour où `clip-v3` existe à
   * la passerelle (`NEXT_PUBLIC_APP_IDENTIFIER=clip-v3`), elle s'allume d'elle-même.
   */
  productApp: string | null
  /** Un type de données de Clip, compté pour confirmer qu'une personne est cliente (le réglage de l'usine). */
  probeType: string
  /** L'application des prospects à la passerelle (`SANDBOXES_APP`, « sandboxes » par défaut). */
  sandboxesApp: string
  /** L'API de Sandboxes ; null sans `SANDBOXES_URL` ou `SANDBOXES_CLE` : les prospects sont refusés avec un message clair. */
  sandboxes: { url: string; cle: string } | null
}

const DEFAULT_GATEWAY = 'https://qa.gateway.intelligenceindustrielle.com'
const trimUrl = (v: string | undefined) => (v ?? '').trim().replace(/\/+$/, '')
const httpUrl = (v: string) => (/^https?:\/\/[^\s/]+/.test(v) ? v : '')

export function decouvrirConfig(env: Env = process.env): DecouvrirConfig {
  // La passerelle de Découvrir : celle des comptes que l'équipe d'II crée pour les prospects (la production),
  // même quand Clip lui-même tourne encore sur une autre (QA). Sans DECOUVRIR_GATEWAY_URL, celle de Clip.
  const product = httpUrl(trimUrl(env.NEXT_PUBLIC_GATEWAY_URL)) || DEFAULT_GATEWAY
  const gateway = httpUrl(trimUrl(env.DECOUVRIR_GATEWAY_URL)) || product
  const app = (env.NEXT_PUBLIC_APP_IDENTIFIER ?? '').trim() || 'html'
  const url = httpUrl(trimUrl(env.SANDBOXES_URL))
  const cle = (env.SANDBOXES_CLE ?? '').trim()
  return {
    gateway,
    productApp: app === 'html' ? null : app,
    // Le réglage de l'usine (`T.org` de src/lib/model/repo.ts), sans tirer ce module dans l'intercepteur.
    probeType: 'clip_org',
    sandboxesApp: (env.SANDBOXES_APP ?? '').trim() || 'sandboxes',
    sandboxes: url && cle ? { url, cle } : null,
  }
}
