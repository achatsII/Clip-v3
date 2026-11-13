import { describe, expect, it } from 'vitest'
import { billingModeOf } from '@/lib/billing/mode'

const on = { billingPreview: true, billingPreviewApp: true }

describe('le mode de la facturation', () => {
  it('le drapeau allumé : la plateforme fait foi, sur le web comme dans l’app', () => {
    expect(billingModeOf({ live: true, inApp: false, loading: true, toggles: undefined })).toBe('live')
    expect(billingModeOf({ live: true, inApp: true, loading: false, toggles: { billingPreview: false } })).toBe('live')
  })

  it('l’aperçu sur le web suit `billingPreview`', () => {
    expect(billingModeOf({ live: false, inApp: false, loading: false, toggles: on })).toBe('preview')
    expect(billingModeOf({ live: false, inApp: false, loading: false, toggles: { ...on, billingPreviewApp: false } })).toBe('preview')
    expect(billingModeOf({ live: false, inApp: false, loading: false, toggles: { ...on, billingPreview: false } })).toBe('off')
  })

  it('dans l’app mobile, l’aperçu demande aussi `billingPreviewApp` (il se coupe seul avant les magasins)', () => {
    expect(billingModeOf({ live: false, inApp: true, loading: false, toggles: on })).toBe('preview')
    expect(billingModeOf({ live: false, inApp: true, loading: false, toggles: { ...on, billingPreviewApp: false } })).toBe('off')
    expect(billingModeOf({ live: false, inApp: true, loading: false, toggles: { ...on, billingPreview: false } })).toBe('off')
  })

  it('serveur muet : le repli n’ouvre jamais l’aperçu ; configuration en lecture : en attente', () => {
    expect(billingModeOf({ live: false, inApp: true, loading: false, toggles: undefined })).toBe('off')
    expect(billingModeOf({ live: false, inApp: false, loading: false, toggles: undefined })).toBe('off')
    expect(billingModeOf({ live: false, inApp: true, loading: true, toggles: undefined })).toBe('pending')
  })
})
