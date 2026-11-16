'use client'

/**
 * Proposer des relevés à la génération (module `records`) : le choix de la personne, gardé sur
 * l'appareil comme « Annoter les images » (`clip_pref_propose_checks` ; oui par défaut). L'IA en
 * propose seulement là où une étape demande de lire une valeur, de vérifier un point ou de noter un
 * numéro, sans jamais inventer de limite ; l'auteur les garde ou les retire, et aucun ne va au poste
 * sans lui (`proposed`). Non : la consigne dit de n'en proposer aucun, et la fin les retire.
 */
import { useSyncExternalStore } from 'react'

const KEY = 'clip_pref_propose_checks'
const listeners = new Set<() => void>()

export function readProposeChecks(): boolean {
  try {
    return localStorage.getItem(KEY) !== 'off'
  } catch {
    return true
  }
}

export function setProposeChecks(on: boolean) {
  try {
    localStorage.setItem(KEY, on ? 'on' : 'off')
  } catch {
    /* appareil sans stockage : le choix vaut pour cette page */
  }
  listeners.forEach((fn) => fn())
}

const subscribe = (fn: () => void) => {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

export function useProposeChecks(): boolean {
  return useSyncExternalStore(subscribe, readProposeChecks, () => true)
}
