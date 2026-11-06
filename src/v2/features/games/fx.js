// 게임 효과: 떠오르는 글자, 반짝이 터짐, 흔들림, 진동, 축하 꽃가루. 움직임 줄이기면 최소화.
const COLORS = ['#ff7a59', '#5e5ce6', '#bf5af2', '#30b07a', '#ffcc00', '#0a84ff']
const calm = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

// el 기준 host 안 좌표(중심)
export function center(host, el) {
  const h = host.getBoundingClientRect(); const r = el.getBoundingClientRect()
  return { x: r.left - h.left + r.width / 2, y: r.top - h.top + r.height / 2 }
}

export function pop(host, x, y, text, tone = 'good') {
  if (!host) return
  const n = document.createElement('span')
  n.className = `fx-pop fx-${tone}`; n.textContent = text
  n.style.left = `${x}px`; n.style.top = `${y}px`
  host.appendChild(n)
  const a = n.animate(calm() ? [{ opacity: 1 }, { opacity: 0 }] : [
    { transform: 'translate(-50%,-50%) scale(.5)', opacity: 0 },
    { transform: 'translate(-50%,-90%) scale(1.25)', opacity: 1, offset: 0.25 },
    { transform: 'translate(-50%,-220%) scale(1)', opacity: 0 }], { duration: 800, easing: 'cubic-bezier(.2,.8,.3,1)' })
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

export const buzz = (ms = 30) => { try { navigator.vibrate?.(ms) } catch { /* 지원 안 함 */ } }

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
