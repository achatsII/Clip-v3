/**
 * Imprimer une page HTML autonome : par la coquille quand elle sait imprimer (capacité `print`),
 * sinon par un cadre caché, retiré après l'impression. Le navigateur ouvre sa fenêtre d'impression
 * habituelle (imprimante ou PDF).
 */
import { callNative, hasCapability } from '../bridge/native'

export async function printHtml(html: string): Promise<void> {
  if (hasCapability('print')) {
    await callNative('print', { html }).catch(() => undefined)
    return
  }
  const frame = document.createElement('iframe')
  frame.setAttribute('aria-hidden', 'true')
  frame.tabIndex = -1
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none'
  document.body.appendChild(frame)
  await new Promise<void>((resolve) => {
    frame.onload = () => resolve()
    frame.srcdoc = html
  })
  const win = frame.contentWindow
  if (!win) return frame.remove()
  const done = () => frame.remove()
  win.addEventListener('afterprint', done, { once: true })
  // Filet : certains navigateurs n'annoncent jamais la fin de l'impression.
  setTimeout(done, 10 * 60_000)
  win.focus()
  win.print()
}

/** Échappe un texte pour l'écrire dans du HTML. */
export const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
