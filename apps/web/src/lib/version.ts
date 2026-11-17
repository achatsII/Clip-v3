/**
 * La version de CLIP : 2.0.x. Le dernier chiffre augmente à chaque mise en production (on le change
 * ici, dans le commit qui part en production) ; la date et le commit de la mise en ligne viennent de
 * la build (`next.config.ts`). On sait ainsi d'un coup d'œil si on a la dernière version.
 */
export const APP_VERSION = '2.0.1'

/** Le commit de la build, en court (« 83804b1 ») ; vide hors d'une build. */
export const BUILD_SHA = (process.env.NEXT_PUBLIC_BUILD_SHA ?? '').slice(0, 7)

/** Le moment de la build (ISO) ; vide hors d'une build. */
export const BUILD_DATE = process.env.NEXT_PUBLIC_BUILD_DATE ?? ''
