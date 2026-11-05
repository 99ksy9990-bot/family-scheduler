// 카드 짝맞추기 순수 로직 (화면과 분리, 테스트 대상)
export const LEVELS = { easy: { cols: 3, pairs: 6 }, normal: { cols: 4, pairs: 8 }, hard: { cols: 4, pairs: 10 } }
export const FACES = ['dad', 'mom', 'big', 'little'].flatMap((c) => ['basic', 'busy', 'done'].map((e) => `${c}_${e}`))

export function shuffle(list, rand = Math.random) {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i -= 1) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] }
  return a
}

export function newDeck(level, rand = Math.random) {
  const faces = shuffle(FACES, rand).slice(0, LEVELS[level].pairs)
  return shuffle([...faces, ...faces], rand).map((face, id) => ({ id, face, matched: false }))
}

// 카드 하나를 뒤집은 뒤의 상태. open: 열린 카드 id 목록(최대 2)
export function flip(state, id) {
  const { deck, open, moves } = state
  const card = deck[id]
  if (!card || card.matched || open.includes(id) || open.length === 2) return state
  const nextOpen = [...open, id]
  if (nextOpen.length < 2) return { ...state, open: nextOpen }
  const [a, b] = nextOpen.map((i) => deck[i])
  if (a.face !== b.face) return { ...state, open: nextOpen, moves: moves + 1 }
  return { ...state, open: [], moves: moves + 1, deck: deck.map((c) => (c.id === a.id || c.id === b.id ? { ...c, matched: true } : c)) }
}

export const closeMismatch = (state) => ({ ...state, open: [] })
export const isDone = (state) => state.deck.every((c) => c.matched)
