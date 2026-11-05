import { loadLegacyState } from '../../lib/legacyState.js'

const copyState = (state) => {
  if (!state || typeof state !== 'object' || Array.isArray(state)) {
    throw new TypeError('가족 상태는 객체여야 합니다.')
  }
  return structuredClone(state)
}

export function fromLegacy(state) {
  const next = copyState(state)
  next.v2SchemaVersion = 1
  next.taskCategories ??= ['긴급', '장보기', '집안일']
  if (Array.isArray(next.profiles)) {
    // 캐릭터 선택·디자인은 1단계 담당. 미선택 상태만 추가한다.
    next.profiles = next.profiles.map((profile) => ({ characterId: null, ...profile }))
  }
  // recurrence는 기존 공용 recurrence.js 형식을 그대로 통과시킨다.
  return next
}

export function toLegacy(state) {
  return copyState(state)
}

export function readLegacyStorage(storage) {
  return fromLegacy(loadLegacyState(storage, { persistRecovery: false }))
}
