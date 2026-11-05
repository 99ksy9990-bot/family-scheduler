// 순서 기억하기 순수 로직
export const PADS = ['dad', 'mom', 'big', 'little']
export const SPEED = { easy: 900, normal: 650, hard: 420 } // 한 칸 반짝 간격(ms)

export const start = (rand = Math.random) => ({ seq: [Math.floor(rand() * 4)], pos: 0, lives: 1, over: false })

// 누른 칸 처리. result: 'ok'(계속) | 'round'(한 단계 통과) | 'retry'(틀렸지만 기회 사용) | 'over'
export function press(state, pad, level, rand = Math.random) {
  if (state.over) return { state, result: 'over' }
  if (state.seq[state.pos] !== pad) {
    if (level === 'easy' && state.lives > 0) return { state: { ...state, pos: 0, lives: state.lives - 1 }, result: 'retry' }
    return { state: { ...state, over: true }, result: 'over' }
  }
  if (state.pos + 1 < state.seq.length) return { state: { ...state, pos: state.pos + 1 }, result: 'ok' }
  return { state: { ...state, seq: [...state.seq, Math.floor(rand() * 4)], pos: 0 }, result: 'round' }
}

export const stage = (state) => state.seq.length - 1 // 통과한 단계 수
