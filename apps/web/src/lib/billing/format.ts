import { locale } from '@/lib/i18n'

/** Un prix, dans la langue de l'outil : « 149 $ », « 49,50 $ ». */
export function formatPrice(cents: number, currency: string) {
  return new Intl.NumberFormat(locale(), { style: 'currency', currency, minimumFractionDigits: cents % 100 ? 2 : 0 }).format(cents / 100)
}
