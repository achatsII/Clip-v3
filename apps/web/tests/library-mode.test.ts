import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { instructionHref, setLibraryMode, useLibraryMode } from '@/lib/ui/libraryMode'

beforeEach(() => localStorage.clear())

describe('lire ou modifier, depuis la bibliothèque', () => {
  it('« Lire » ouvre la version publiée ; une instruction jamais publiée s’ouvre dans l’éditeur ; « Modifier », toujours l’éditeur', () => {
    expect(instructionHref('i1', 'read', true)).toBe('/instructions/i1/lire')
    expect(instructionHref('i1', 'read', false)).toBe('/instructions/i1')
    expect(instructionHref('i1', 'edit', true)).toBe('/instructions/i1')
  })

  it('le choix de qui rédige est retenu sur l’appareil ; qui ne rédige pas lit toujours', () => {
    const writer = renderHook(() => useLibraryMode(true))
    expect(writer.result.current).toBe('edit')
    act(() => setLibraryMode('read'))
    expect(writer.result.current).toBe('read')
    expect(localStorage.getItem('clip_pref_library_mode')).toBe('read')
    act(() => setLibraryMode('edit'))
    const reader = renderHook(() => useLibraryMode(false))
    expect(reader.result.current).toBe('read')
  })
})
