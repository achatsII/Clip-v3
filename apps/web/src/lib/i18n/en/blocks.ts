import type { blocks as Fr } from '../fr/blocks'

const num = (n: number) => n.toLocaleString('en-CA')
const plural = (n: number, one: string, many: string) => (n === 1 ? one : many)

export const blocks: typeof Fr = {
  make: 'Make a shared block',
  insert: 'Insert a shared block',
  makeIntro: 'The chosen steps become a block: written once, it is reused in other instructions and updated everywhere.',
  name: 'Block name',
  namePlaceholder: 'Lock out press P-12',
  pick: 'The block’s steps',
  makeConfirm: 'Make the block',
  made: (title: string) => `Block “${title}” created`,
  madeHint: 'Its steps are now edited in the block.',
  makeFailed: 'The block was not created',
  search: 'Search a block',
  empty: 'No shared block yet',
  emptyHint: 'Make one from the steps of an instruction (“…” menu).',
  already: 'Already in this instruction',
  inserted: (title: string) => `Block “${title}” inserted`,
  insertFailed: 'The block was not inserted',
  steps: (n: number) => `${num(n)} ${plural(n, 'step', 'steps')}`,
  stepNotice: (title: string, version: number) => `Step from the shared block “${title}” (v${num(version)}): it is edited in the block, everywhere at once.`,
  more: 'More block actions',
  open: 'Open the block',
  detach: 'Detach',
  detachConfirm: { title: 'Detach these steps from the block?', description: 'They become this instruction’s own steps: you can edit them here, but they no longer follow the block.', confirm: 'Detach' },
  remove: 'Remove the block',
  removeConfirm: { title: 'Remove the block from this instruction?', description: 'Its steps leave this instruction; the block stays for the others.', confirm: 'Remove' },
  thumb: 'Block',
  chip: 'Shared block',
  editing: (n: number) => (n ? `Shared block used in ${num(n)} ${plural(n, 'instruction', 'instructions')}: publishing it updates them.` : 'Shared block: it is not in any instruction yet. Insert it from an instruction, “…” menu.'),
  info: 'Title and details',
  infoOpen: 'Edit the title and details',
  infoTitle: 'Block details',
  summaryPlaceholder: 'What this block is for, in one sentence',
  archiveDescription: (n: number) =>
    n === 0
      ? 'It leaves the list of blocks. Its versions are kept.'
      : n === 1
        ? 'The instruction that uses it keeps its steps as they are; to change them, detach them there.'
        : `The ${num(n)} instructions that use it keep its steps as they are; to change them, detach them in each one.`,
  archived: 'Block archived',
  publishImpact: (n: number) => (n ? `Publishing updates ${num(n)} ${plural(n, 'instruction', 'instructions')}: up-to-date ones are republished, the others get the block in their draft.` : 'No instruction uses it yet: insert it in an instruction, “…” menu.'),
  propagating: (done: number, total: number) => `Updating instructions… ${num(done)} of ${num(total)}`,
  propagated: (republished: number, drafts: number) =>
    [republished ? `${num(republished)} ${plural(republished, 'instruction republished', 'instructions republished')}` : '', drafts ? `${num(drafts)} ${plural(drafts, 'draft updated', 'drafts updated')}` : ''].filter(Boolean).join(' · ') || 'No instruction to update',
  propagateFailed: (n: number) => `${num(n)} ${plural(n, 'instruction was', 'instructions were')} not updated: publish the block again to retry.`,
  filter: 'Shared blocks',
  newBlock: 'New block',
  newTitle: 'New shared block',
  total: (n: number) => (n > 1 ? `${num(n)} shared blocks` : n === 1 ? '1 shared block' : 'No shared block'),
  emptyList: 'The steps that come back everywhere (lockout, start-up, PPE): written once, up to date in every instruction. Create one here, or from the steps of an instruction (“…” menu).',
  changelog: (title: string, version: number) => `Shared block “${title}” v${num(version)}.`,
  errors: {
    noSteps: 'Choose at least one step.',
    locked: (title: string) => `This step comes from the shared block “${title}”: it is edited in the block.`,
  },
}
