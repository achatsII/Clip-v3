import type { Metadata } from 'next'
import { DecouvrirShell } from '@/components/decouvrir/Shell'
import { accessMode, decouvrirConfig } from '@/lib/decouvrir/server/config'

/**
 * L'espace Découvrir : ce qu'un prospect voit de Clip sans vendeur à côté (vidéos, conseiller). Public tant
 * que `DECOUVRIR_ACCES` est absent ou « ouvert » ; avec « sandboxes », il demande une entrée (src/proxy.ts).
 * Les pages sont statiques : le mode se lit ici, au build (changer l'interrupteur, c'est redéployer). Aucune
 * donnée de Clip ne s'y charge. Les métadonnées se rendent au serveur : en français, la langue source.
 */
export const metadata: Metadata = {
  title: { default: 'Découvrir Clip', template: '%s · Découvrir Clip' }, // i18n-ignore : rendu au serveur
  description: "Comprendre Clip à votre rythme : des vidéos et un conseiller IA qui répond sur ce que le logiciel fait aujourd'hui.", // i18n-ignore : rendu au serveur
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const setup = { mode: accessMode(), clients: decouvrirConfig().productApp !== null }
  return <DecouvrirShell setup={setup}>{children}</DecouvrirShell>
}
