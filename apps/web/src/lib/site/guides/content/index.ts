/**
 * Les textes des guides, par langue. Une langue absente n'a pas encore ses guides : ses pages répondent 404
 * et aucun hreflang ne la nomme.
 */
import type { SiteLang } from '../../lang'
import type { GuidesDict } from '../types'
import { en } from './en'
import { fr } from './fr'

export const GUIDE_DICTS: Partial<Record<SiteLang, GuidesDict>> = { fr, en }
