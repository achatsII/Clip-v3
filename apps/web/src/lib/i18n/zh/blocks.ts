import type { blocks as Fr } from '../fr/blocks'

const num = (n: number) => n.toLocaleString('zh-CN')

export const blocks: typeof Fr = {
  make: '创建共享模块',
  insert: '插入共享模块',
  makeIntro: '所选步骤将成为一个模块：只需编写一次，即可在其他作业指导书中复用，并在所有位置同步更新。',
  name: '模块名称',
  namePlaceholder: '冲床 P-12 上锁挂牌',
  pick: '模块的步骤',
  makeConfirm: '创建模块',
  made: (title: string) => `已创建模块“${title}”`,
  madeHint: '这些步骤今后在模块中编辑。',
  makeFailed: '未能创建模块',
  search: '搜索模块',
  empty: '还没有共享模块',
  emptyHint: '可从某份作业指导书的步骤中创建（“…”菜单）。',
  already: '已在此作业指导书中',
  inserted: (title: string) => `已插入模块“${title}”`,
  insertFailed: '未能插入模块',
  steps: (n: number) => `${num(n)} 个步骤`,
  stepNotice: (title: string, version: number) => `来自共享模块“${title}”（v${num(version)}）的步骤：请在模块中编辑，所有位置会同步更新。`,
  more: '更多模块操作',
  open: '打开模块',
  detach: '分离',
  detachConfirm: { title: '要将这些步骤从模块中分离吗？', description: '它们将成为这份作业指导书自己的步骤：你可以在此编辑，但不再跟随模块更新。', confirm: '分离' },
  remove: '移除模块',
  removeConfirm: { title: '要从这份作业指导书中移除该模块吗？', description: '它的步骤会从这份作业指导书中移除；模块仍保留给其他作业指导书使用。', confirm: '移除' },
  thumb: '模块',
  chip: '共享模块',
  editing: (n: number) => (n ? `共享模块，已用于 ${num(n)} 份作业指导书：发布后会同步更新它们。` : '共享模块：尚未用于任何作业指导书。请在作业指导书中通过“…”菜单插入。'),
  info: '标题和详情',
  infoOpen: '编辑标题和详情',
  infoTitle: '模块详情',
  summaryPlaceholder: '用一句话说明这个模块的用途',
  archiveDescription: (n: number) =>
    n === 0
      ? '它会从模块列表中移除，其各个版本仍会保留。'
      : n === 1
        ? '使用它的那份作业指导书会保持步骤原样；如需修改，请在该作业指导书中将步骤分离。'
        : `使用它的 ${num(n)} 份作业指导书会保持步骤原样；如需修改，请在各自的作业指导书中分离。`,
  archived: '模块已归档',
  publishImpact: (n: number) => (n ? `发布后会更新 ${num(n)} 份作业指导书：已是最新的会重新发布，其他的则把该模块加入草稿。` : '尚无作业指导书使用它：请在作业指导书中通过“…”菜单插入。'),
  propagating: (done: number, total: number) => `正在更新作业指导书… ${num(done)} / ${num(total)}`,
  propagated: (republished: number, drafts: number) =>
    [republished ? `已重新发布 ${num(republished)} 份作业指导书` : '', drafts ? `已更新 ${num(drafts)} 份草稿` : ''].filter(Boolean).join(' · ') || '没有需要更新的作业指导书',
  propagateFailed: (n: number) => `有 ${num(n)} 份作业指导书未更新：请再次发布该模块以重试。`,
  filter: '共享模块',
  newBlock: '新建模块',
  newTitle: '新建共享模块',
  total: (n: number) => (n ? `${num(n)} 个共享模块` : '没有共享模块'),
  emptyList: '到处都会出现的步骤（上锁挂牌、启动、PPE）：只需写一次，所有作业指导书同步更新。可在此创建，也可从某份作业指导书的步骤中创建（“…”菜单）。',
  changelog: (title: string, version: number) => `共享模块“${title}” v${num(version)}。`,
  errors: {
    noSteps: '请至少选择一个步骤。',
    locked: (title: string) => `此步骤来自共享模块“${title}”：请在模块中编辑。`,
  },
}
