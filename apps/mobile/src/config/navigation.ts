import { isSameOrigin } from './env'

/**
 * Ce qui peut se charger dans la WebView sans quitter l'app : l'app web elle-même, les adresses
 * internes du navigateur, et les cadres intégrés (lecteur, carte), dont la page décide. Une
 * navigation de la page entière vers un autre site sort vers le navigateur du système.
 */
export function shouldLoadInApp(req: { url: string; isTopFrame?: boolean }, origin: string): boolean {
  const { url } = req
  if (/^(about|blob|data):/i.test(url)) return true
  if (isSameOrigin(url, origin)) return true
  return req.isTopFrame === false
}
