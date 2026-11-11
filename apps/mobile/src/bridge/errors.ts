import type { BridgeErrorCode } from './protocol'
import { strings } from '../i18n'

/** Une erreur rendue à la page avec un code du contrat et un message lisible. */
export class BridgeError extends Error {
  readonly code: BridgeErrorCode

  constructor(code: BridgeErrorCode, message: string) {
    super(message)
    this.name = 'BridgeError'
    this.code = code
  }
}

export const cancelled = () => new BridgeError('cancelled', strings().errors.cancelled)
