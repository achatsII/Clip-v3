import type { blocks as Fr } from '../fr/blocks'

const num = (n: number) => n.toLocaleString('ko-KR')

export const blocks: typeof Fr = {
  make: '공통 블록 만들기',
  insert: '공통 블록 삽입',
  makeIntro: '선택한 단계가 블록이 됩니다. 한 번 작성해 두면 다른 지시서에서 재사용하고, 모든 곳에서 함께 업데이트됩니다.',
  name: '블록 이름',
  namePlaceholder: '프레스 P-12 잠금',
  pick: '블록의 단계',
  makeConfirm: '블록 만들기',
  made: (title: string) => `블록 “${title}”을(를) 만들었습니다`,
  madeHint: '이제 이 단계들은 블록에서 편집합니다.',
  makeFailed: '블록을 만들지 못했습니다',
  search: '블록 검색',
  empty: '공통 블록이 아직 없습니다',
  emptyHint: '지시서의 단계로 만들 수 있습니다 (“…” 메뉴).',
  already: '이미 이 지시서에 있습니다',
  inserted: (title: string) => `블록 “${title}”을(를) 삽입했습니다`,
  insertFailed: '블록을 삽입하지 못했습니다',
  steps: (n: number) => `${num(n)}단계`,
  stepNotice: (title: string, version: number) => `공통 블록 “${title}”(v${num(version)})의 단계입니다. 블록에서 편집하면 모든 곳에 한꺼번에 반영됩니다.`,
  more: '블록 기능 더보기',
  open: '블록 열기',
  detach: '분리',
  detachConfirm: { title: '이 단계를 블록에서 분리할까요?', description: '이 지시서 고유의 단계가 됩니다. 여기서 편집할 수 있지만 더 이상 블록을 따라가지 않습니다.', confirm: '분리' },
  remove: '블록 제거',
  removeConfirm: { title: '이 지시서에서 블록을 제거할까요?', description: '블록의 단계가 이 지시서에서 빠집니다. 블록은 다른 지시서에 그대로 남습니다.', confirm: '제거' },
  thumb: '블록',
  chip: '공통 블록',
  editing: (n: number) => (n ? `공통 블록이 지시서 ${num(n)}개에서 사용 중입니다. 게시하면 모두 업데이트됩니다.` : '공통 블록: 아직 어떤 지시서에도 없습니다. 지시서의 “…” 메뉴에서 삽입하세요.'),
  info: '제목과 설명',
  infoOpen: '제목과 설명 편집',
  infoTitle: '블록 상세',
  summaryPlaceholder: '이 블록의 용도를 한 문장으로',
  archiveDescription: (n: number) =>
    n === 0
      ? '블록 목록에서 빠집니다. 버전은 보관됩니다.'
      : n === 1
        ? '이 블록을 사용하는 지시서는 단계를 그대로 유지합니다. 바꾸려면 그 지시서에서 분리하세요.'
        : `이 블록을 사용하는 지시서 ${num(n)}개는 단계를 그대로 유지합니다. 바꾸려면 각 지시서에서 분리하세요.`,
  archived: '블록을 보관했습니다',
  publishImpact: (n: number) => (n ? `게시하면 지시서 ${num(n)}개가 업데이트됩니다. 최신 상태인 지시서는 다시 게시되고, 나머지는 초안에 블록이 반영됩니다.` : '아직 이 블록을 쓰는 지시서가 없습니다. 지시서의 “…” 메뉴에서 삽입하세요.'),
  propagating: (done: number, total: number) => `지시서 업데이트 중… ${num(total)}개 중 ${num(done)}개`,
  propagated: (republished: number, drafts: number) =>
    [republished ? `지시서 ${num(republished)}개 재게시` : '', drafts ? `초안 ${num(drafts)}개 업데이트` : ''].filter(Boolean).join(' · ') || '업데이트할 지시서가 없습니다',
  propagateFailed: (n: number) => `지시서 ${num(n)}개를 업데이트하지 못했습니다. 블록을 다시 게시하면 재시도합니다.`,
  filter: '공통 블록',
  newBlock: '새 블록',
  newTitle: '새 공통 블록',
  total: (n: number) => (n > 0 ? `공통 블록 ${num(n)}개` : '공통 블록 없음'),
  emptyList: '어디서나 반복되는 단계(잠금, 기동, 보호구)를 한 번만 작성하면 모든 지시서에서 최신 상태로 유지됩니다. 여기서 만들거나, 지시서의 단계에서 만들 수 있습니다(“…” 메뉴).',
  changelog: (title: string, version: number) => `공통 블록 “${title}” v${num(version)}.`,
  errors: {
    noSteps: '단계를 하나 이상 선택하세요.',
    locked: (title: string) => `이 단계는 공통 블록 “${title}”에서 가져온 것입니다. 블록에서 편집하세요.`,
  },
}
