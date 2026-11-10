import { WEB_RECEIVER, type BridgeEventMessage, type BridgeResponseMessage, type Capability, type NativeEnvironment } from './protocol'

/**
 * Le script injecté avant le chargement de chaque page : il pose `window.__CLIP_NATIVE__`,
 * que la page lit avant d'appeler une capacité.
 */
export function environmentScript(env: NativeEnvironment): string {
  return `(function(){try{window.__CLIP_NATIVE__=${JSON.stringify(env)};}catch(e){}})();true;`
}

/**
 * Met à jour les capacités annoncées sans recharger la page (configuration relue au retour au
 * premier plan), puis prévient la page par l'événement `clipnativechange`.
 */
export function capabilitiesUpdateScript(capabilities: readonly Capability[]): string {
  return `(function(){try{if(window.__CLIP_NATIVE__){window.__CLIP_NATIVE__.capabilities=${JSON.stringify(
    capabilities,
  )};window.dispatchEvent(new Event('clipnativechange'));}}catch(e){}})();true;`
}

/**
 * Livre une réponse ou un événement à la page. Le message est passé en texte JSON à
 * `window.__clipBridgeReceive` ; si la page n'a pas encore posé son récepteur, il est perdu
 * (seuls les événements peuvent arriver avant elle : les réponses suivent ses requêtes).
 */
export function deliveryScript(message: BridgeResponseMessage | BridgeEventMessage): string {
  const json = JSON.stringify(message)
  return `(function(){try{var r=window.${WEB_RECEIVER};if(typeof r==='function'){r(${JSON.stringify(json)});}}catch(e){}})();true;`
}
