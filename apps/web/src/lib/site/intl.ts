import { notFound } from 'next/navigation'
import { INTL_LANGS, type IntlLang } from './lang'

/** La langue d'une page sous /<langue> ; une autre adresse répond 404. */
export const intlLang = (lang: string): IntlLang => ((INTL_LANGS as readonly string[]).includes(lang) ? (lang as IntlLang) : notFound())
