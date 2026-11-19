'use client'

import { useSyncExternalStore } from 'react'
import { Card } from '@/components/ui/Surface'
import { inNativeShell } from '@/lib/bridge/native'
import { usePref, writePref } from '@/lib/prefs'
import { useToggle } from '@/lib/toggles'
import { useWide } from '@/lib/ui/screen'
import { GetTheApp, hasStoreLink } from './GetTheApp'
import { OpenOnComputer } from './OpenOnComputer'

/** Rangées d'un geste (« Plus tard ») sur cet appareil : elles ne reviennent pas sur l'accueil ; le menu les garde. */
const GET_APP_HIDDEN = 'clip_pref_get_app_hidden'
const COMPUTER_HIDDEN = 'clip_pref_computer_hidden'

const noSubscribe = () => () => {}

/**
 * L'accueil passe d'un appareil à l'autre : à l'ordinateur, « CLIP sur votre téléphone » (toggle `storeLinks`) ; dans
 * l'app mobile, « Sur votre ordinateur » (toggle `desktopHint`). Rien sur le navigateur d'un téléphone : le menu
 * (« L'app mobile ») y suffit.
 */
export function DeviceCard() {
  const storeLinks = useToggle('storeLinks')
  const desktopHint = useToggle('desktopHint')
  const wide = useWide()
  const inApp = useSyncExternalStore(noSubscribe, inNativeShell, () => false)
  const appHidden = usePref(GET_APP_HIDDEN) === '1'
  const computerHidden = usePref(COMPUTER_HIDDEN) === '1'

  if (inApp) {
    if (!desktopHint || computerHidden) return null
    return (
      <Card className="p-5">
        <OpenOnComputer onLater={() => writePref(COMPUTER_HIDDEN, '1')} />
      </Card>
    )
  }
  if (!storeLinks || !wide || appHidden || !hasStoreLink()) return null
  return (
    <Card className="p-6">
      <GetTheApp onLater={() => writePref(GET_APP_HIDDEN, '1')} />
    </Card>
  )
}
