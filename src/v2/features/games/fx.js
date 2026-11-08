// 게임 효과: 떠오르는 글자, 반짝이 터짐, 흔들림, 진동, 축하 꽃가루. 움직임 줄이기면 최소화.
const COLORS = ['#ff7a59', '#5e5ce6', '#bf5af2', '#30b07a', '#ffcc00', '#0a84ff']
const calm = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

// el 기준 host 안 좌표(중심)
export function center(host, el) {
  const h = host.getBoundingClientRect(); const r = el.getBoundingClientRect()
  return { x: r.left - h.left + r.width / 2, y: r.top - h.top + r.height / 2 }
}

export function pop(host, x, y, text, tone = 'good', duration = 1500) {
  if (!host) return
  const n = document.createElement('span')
  n.className = `fx-pop fx-${tone}`; n.textContent = text
  // 동시에 여러 개면 위아래로 비켜서 겹치지 않게
  n.style.top = `${y - host.querySelectorAll('.fx-pop').length * 38}px`
  host.appendChild(n)
  // 글자가 판 밖으로 잘리지 않게 가로 위치를 안쪽으로
  const half = n.offsetWidth / 2 + 4
  n.style.left = `${Math.min(Math.max(x, half), Math.max(half, host.clientWidth - half))}px`
  // 천천히 커졌다가 잠깐 멈춰서 읽을 시간을 준 뒤 올라가며 사라짐
  const a = n.animate(calm() ? [{ opacity: 1 }, { opacity: 1, offset: 0.7 }, { opacity: 0 }] : [
    { transform: 'translate(-50%,-50%) scale(.6)', opacity: 0 },
    { transform: 'translate(-50%,-80%) scale(1.15)', opacity: 1, offset: 0.15 },
    { transform: 'translate(-50%,-90%) scale(1)', opacity: 1, offset: 0.7 },
    { transform: 'translate(-50%,-160%) scale(1)', opacity: 0 }], { duration, easing: 'ease-out' })
  a.onfinish = () => n.remove()
}

export function burst(host, x, y, count = 10, src = '/game/sparkle.png') {
  if (!host || calm()) return
  for (let i = 0; i < count; i += 1) {
    const n = document.createElement('img')
    n.src = src; n.alt = ''; n.className = 'fx-spark'
    n.style.left = `${x}px`; n.style.top = `${y}px`
    host.appendChild(n)
    const ang = (Math.PI * 2 * i) / count + Math.random() * 0.5
    const d = 55 + Math.random() * 55
    const a = n.animate([
      { transform: 'translate(-50%,-50%) scale(.3) rotate(0deg)', opacity: 1 },
      { transform: `translate(calc(-50% + ${Math.cos(ang) * d}px), calc(-50% + ${Math.sin(ang) * d}px)) scale(1) rotate(${180 + Math.random() * 180}deg)`, opacity: 0 }],
    { duration: 550 + Math.random() * 250, easing: 'cubic-bezier(.1,.7,.3,1)' })
    a.onfinish = () => n.remove()
  }
  // 색 점 + 퍼지는 고리
  for (let i = 0; i < count; i += 1) {
    const d = document.createElement('i')
    d.className = 'fx-dot'; d.style.left = `${x}px`; d.style.top = `${y}px`; d.style.background = COLORS[i % COLORS.length]
    host.appendChild(d)
    const ang = Math.random() * Math.PI * 2; const r = 50 + Math.random() * 50
    d.animate([{ transform: 'translate(-50%,-50%) scale(1)', opacity: 1 }, { transform: `translate(calc(-50% + ${Math.cos(ang) * r}px), calc(-50% + ${Math.sin(ang) * r}px)) scale(.2)`, opacity: 0 }], { duration: 600, easing: 'cubic-bezier(.1,.7,.3,1)' }).onfinish = () => d.remove()
  }
  const ring = document.createElement('i')
  ring.className = 'fx-ring'; ring.style.left = `${x}px`; ring.style.top = `${y}px`
  host.appendChild(ring)
  ring.animate([{ transform: 'translate(-50%,-50%) scale(.5)', opacity: 1 }, { transform: 'translate(-50%,-50%) scale(5)', opacity: 0 }], { duration: 500, easing: 'ease-out' }).onfinish = () => ring.remove()
}

export function shake(el) {
  if (!el || calm()) return
  el.animate([{ translate: '0' }, { translate: '-8px 0' }, { translate: '7px 0' }, { translate: '-5px 0' }, { translate: '3px 0' }, { translate: '0' }], { duration: 360 }) // translate·scale은 따로 놀아서 기존 transform(카드 뒤집기)과 안 부딪힘
}

export function bounce(el, scale = 1.15) {
  if (!el || calm()) return
  el.animate([{ scale: '1' }, { scale: `${scale}` }, { scale: '.96' }, { scale: '1' }], { duration: 380, easing: 'ease-out' })
}

// 효과음 (놀이 화면에서 켜고 끔, 기기마다 저장)
const SOUND_KEY = 'family-scheduler-sound'
export const isSoundOn = () => { try { return localStorage.getItem(SOUND_KEY) !== 'off' } catch { return true } }
export const setSound = (on) => { try { localStorage.setItem(SOUND_KEY, on ? 'on' : 'off') } catch { /* 저장 못 해도 이번만 */ } }
let audio = null
// 게임마다 다른 효과음 (음색·높이)
const SFX = {
  pairs: { type: 'sine', one: [1568], good: [1047, 1319, 1568], bad: [330, 262] },
  catch: { type: 'square', one: [988], good: [784, 1175], bad: [196, 147] },
  tap: { type: 'triangle', one: [523, 784], good: [392, 523, 659], bad: [175, 131] },
  sequence: { type: 'sine', one: [880], good: [659, 880, 1109], bad: [247, 196] },
  stack: { type: 'triangle', one: [440], good: [523, 659, 784], bad: [220, 147] },
  merge: { type: 'sine', one: [698], good: [587, 784], bad: [220, 165] },
  match: { type: 'square', one: [1319], good: [1047, 1397], bad: [262, 196] },
  clean: { type: 'triangle', one: [880], good: [660, 880], bad: [220, 165] },
}
let sfx = SFX.clean
export const setSfx = (game) => { sfx = SFX[game] || SFX.clean }
function tone(freqs, dur = 0.09) {
  if (!isSoundOn()) return
  try {
    audio ||= new (window.AudioContext || window.webkitAudioContext)()
    let t = audio.currentTime
    for (const f of freqs) {
      const o = audio.createOscillator(); const g = audio.createGain()
      o.type = sfx.type; o.frequency.value = f
      g.gain.setValueAtTime(sfx.type === 'square' ? 0.05 : 0.12, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur)
      o.connect(g).connect(audio.destination); o.start(t); o.stop(t + dur); t += dur * 0.8
    }
  } catch { /* 소리 지원 안 함 */ }
}
// 진동 + 효과음: 배열(실패) = 낮은 소리, 긴 진동(큰 성공) = 두 음, 짧은 진동 = 한 음
export const buzz = (ms = 30) => { try { navigator.vibrate?.(ms) } catch { /* 지원 안 함 */ } tone(Array.isArray(ms) ? sfx.bad : ms >= 25 ? sfx.good : sfx.one) }

export function confetti(host, count = 40) {
  if (!host || calm()) return
  const w = host.clientWidth
  for (let i = 0; i < count; i += 1) {
    const n = document.createElement('i')
    n.className = 'fx-confetti'
    n.style.left = `${Math.random() * w}px`; n.style.background = COLORS[i % COLORS.length]
    host.appendChild(n)
    const a = n.animate([
      { transform: `translateY(-20px) rotate(0deg)`, opacity: 1 },
      { transform: `translate(${(Math.random() - 0.5) * 120}px, ${host.clientHeight + 40}px) rotate(${360 + Math.random() * 540}deg)`, opacity: 0.9 }],
    { duration: 1400 + Math.random() * 900, delay: Math.random() * 300, easing: 'cubic-bezier(.3,.1,.6,1)' })
    a.onfinish = () => n.remove()
  }
}

// 배경음악: 게임마다 한 곡 반복 (소리 버튼과 따로 켜고 끔)
const MUSIC_KEY = 'family-scheduler-music'
export const isMusicOn = () => { try { return localStorage.getItem(MUSIC_KEY) !== 'off' } catch { return true } }
let bgm = null
let bgmSrc = ''
const VOL = 0.35
// 서서히 소리 바꾸기 (아이폰은 볼륨을 못 바꿔 바로 바뀜)
function fade(a, to, ms, done) {
  const from = a.volume; const t0 = Date.now()
  const id = setInterval(() => { const k = Math.min(1, (Date.now() - t0) / ms); a.volume = from + (to - from) * k; if (k >= 1) { clearInterval(id); done?.() } }, 50)
}
// 모든 게임이 곡 목록에서 무작위로 틀고, 한 곡이 끝나면 다른 곡으로 (clean은 pairs와 같은 곡이라 뺌)
// shortcut: 곡 목록을 손으로 적음, 수노 곡을 더 받으면 여기에 이름 추가
const TRACKS = ['pairs', 'catch', 'tap', 'sequence', 'stack', 'merge', 'match']
let bgmGame = ''
const pickTrack = (not) => { const list = TRACKS.filter((t) => `/game/music/${t}.m4a` !== not); return list[Math.floor(Math.random() * list.length)] }
function startTrack(src, fadeIn) {
  bgm = new Audio(src); bgmSrc = src; bgm.volume = fadeIn ? 0 : VOL
  const me = bgm
  bgm.onended = () => { if (bgm === me) startTrack(`/game/music/${pickTrack(src)}.m4a`, false) }
  bgm.play().catch(() => {}) // 자동 재생이 막히면 조용히
  if (fadeIn) fade(bgm, VOL, 1200)
}
export function playMusic(game) {
  if (bgm && bgmGame === game) return // 같은 게임 안에서는 곡을 끊지 않음
  const old = bgm; bgm = null
  if (old) fade(old, 0, 800, () => old.pause())
  bgmGame = game
  if (!isMusicOn() || typeof Audio === 'undefined') return
  startTrack(`/game/music/${pickTrack(bgmSrc)}.m4a`, !!old)
}
export function stopMusic() { if (bgm) { bgm.pause(); bgm = null; bgmSrc = ''; bgmGame = '' } }
// 방 완성 '짜잔'
export function fanfare() { const keep = sfx; sfx = { type: 'triangle' }; tone([523, 659, 784, 1047], 0.16); sfx = keep }
export const setMusic = (on, game) => { try { localStorage.setItem(MUSIC_KEY, on ? 'on' : 'off') } catch { /* 이번만 */ } if (on && game) playMusic(game); else stopMusic() }
