import type { feedback as Fr } from '../fr/feedback'

/** Les retours des opérateurs. */
export const feedback: typeof Fr = {
  list: {
    title: 'Operator feedback',
    subtitle: 'What the floor reports: fix the step in one tap, and the operator sees the new version.',
    open: (n: number) => `Open${n ? ` (${n.toLocaleString('en-CA')})` : ''}`,
    handled: 'Handled',
    all: 'All',
    emptyOpenTitle: 'Nothing to handle',
    emptyOpenDescription: 'Operators flag an unclear step from the player in two taps. Their feedback will land here.',
    emptyHandledTitle: 'No handled feedback',
    emptyHandledDescription: 'Feedback you handle shows up here.',
    untitled: 'Instruction',
    step: (n: number) => `step ${n.toLocaleString('en-CA')}`,
    comment: (text: string) => `“${text}”`,
    operator: 'Operator',
    station: 'station',
    sources: { kiosk: 'tablet', link: 'link', app: 'app' },
    photo: 'Attached photo',
    fix: 'Fix',
    markHandled: 'Handled',
    dismiss: 'Dismiss',
    handledBy: (name: string) => `Handled by ${name}`,
    dismissedBy: (name: string) => `Dismissed by ${name}`,
    markedHandled: 'Feedback marked as handled',
    dismissed: 'Feedback dismissed',
    updateFailed: 'The feedback wasn’t updated',
  },
}
