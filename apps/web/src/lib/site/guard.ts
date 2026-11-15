/**
 * Le script en ligne de chaque page du site, exécuté pendant la lecture du HTML, avant l'affichage :
 *
 * - dans la coquille mobile (`window.__CLIP_NATIVE__`, `window.ReactNativeWebView`, ou « CLIPShell/ »
 *   dans l'agent utilisateur), le site ne s'affiche jamais, ni ses prix (règles d'Apple et de
 *   Google) : direction `/accueil` avec une session, sinon `/connexion` ;
 * - sur `/`, une session (le même test que `hasSession` : un jeton `access_token`) mène à `/accueil`,
 *   comme l'ancien écran d'ouverture de l'app ;
 * - en partant, le contenu du site se cache (`site-leaving`) : seul le logo reste, comme avant ;
 * - sur une page anglaise, `<html lang>` passe à `en` (le HTML rendu garde `fr-CA`, le contenu
 *   anglais porte aussi `lang="en"`).
 *
 * Une navigation interne ne réexécute pas ce script : la coquille n'a pas de lien vers le site, et
 * `SiteLanguage` tient la langue du document à jour d'une page à l'autre.
 */
export const SESSION_KEY = 'access_token'

export const SITE_GUARD_SCRIPT = `(function(){try{var d=document.documentElement,p=location.pathname,s=false;try{s=!!localStorage.getItem('${SESSION_KEY}')}catch(e){}var shell=!!(window.__CLIP_NATIVE__||window.ReactNativeWebView)||/CLIPShell\\//.test(navigator.userAgent||'');var to=shell?(s?'/accueil':'/connexion'):(s&&p==='/'?'/accueil':null);if(to){d.classList.add('site-leaving');location.replace(to);return}if(p==='/en'||p.indexOf('/en/')===0)d.lang='en'}catch(e){}})();`
