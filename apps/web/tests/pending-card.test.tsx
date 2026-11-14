import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PendingCard } from '@/components/capture/SourceCard'
import { messages } from '@/lib/i18n'

afterEach(cleanup)

describe('la carte d’un envoi', () => {
  it('réseau coupé : le dit, et garde la barre où l’envoi en était', () => {
    const t = messages()
    const { container } = render(<PendingCard item={{ tempId: 't1', kind: 'video', name: 'geste.mov', stage: 'offline', progress: 0.42 }} onDismiss={vi.fn()} />)
    expect(screen.getByText(t.capture.source.stages.offline)).toBeTruthy()
    expect(screen.getByText(t.capture.source.percent(42))).toBeTruthy()
    expect((container.querySelector('[style*="width"]') as HTMLElement).style.width).toBe('42%')
    // Rien à relancer ni à retirer : l'envoi n'a pas échoué.
    expect(screen.queryByText(t.common.retry)).toBeNull()
  })

  it('envoi raté : « Réessayer » le relance ; sans relance possible, on peut seulement le retirer', () => {
    const t = messages()
    const onRetry = vi.fn()
    const onDismiss = vi.fn()
    const item = { tempId: 't2', kind: 'video' as const, name: 'geste.mov', stage: 'error' as const, error: 'L’envoi a échoué (réseau)' }
    render(<PendingCard item={item} onDismiss={onDismiss} onRetry={onRetry} />)
    fireEvent.click(screen.getByText(t.common.retry))
    expect(onRetry).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByLabelText(t.common.remove))
    expect(onDismiss).toHaveBeenCalledTimes(1)
    cleanup()

    render(<PendingCard item={item} onDismiss={onDismiss} />)
    expect(screen.queryByText(t.common.retry)).toBeNull()
    expect(screen.getByText('L’envoi a échoué (réseau)')).toBeTruthy()
  })
})
