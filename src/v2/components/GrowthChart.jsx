import { useState } from 'react'

// 키·몸무게 변화 선 그래프 (오래된 것 → 최근, 왼쪽 → 오른쪽)
export default function GrowthChart({ records, median }) {
  const [key, setKey] = useState('height')
  const points = records.filter((r) => r[key]).toSorted((a, b) => a.date.localeCompare(b.date))
  const unit = key === 'height' ? 'cm' : 'kg'
  const W = 320, H = 140, P = 28
  const values = points.map((p) => p[key])
  const medians = median ? points.map((p) => median(key, p.date)) : []
  const all = [...values, ...medians.filter((v) => v != null)]
  const min = Math.min(...all), max = Math.max(...all), span = max - min || 1
  const t0 = points.length ? new Date(points[0].date) : 0, t1 = points.length ? new Date(points.at(-1).date) : 0, tSpan = t1 - t0 || 1
  const yOf = (v) => 96 - ((v - min) / span) * 66
  const medXY = points.map((p, i) => medians[i] != null && [P + ((new Date(p.date) - t0) / tSpan) * (W - P * 2), yOf(medians[i])]).filter(Boolean)
  const xy = points.map((p) => [P + ((new Date(p.date) - t0) / tSpan) * (W - P * 2), 96 - ((p[key] - min) / span) * 66])
  return <div className="growth-chart">
    <div className="ui-segments work-mode" role="group" aria-label="그래프 종류">{[['height', '키'], ['weight', '몸무게']].map(([id, label]) => <button key={id} type="button" aria-pressed={key === id} onClick={() => setKey(id)}>{label}</button>)}</div>
    {medXY.length > 1 && points.length > 1 && <p className="growth-legend"><i className="me" />우리 아이 <i className="avg" />또래 평균</p>}
    {points.length < 2 ? <p className="quiet">기록이 두 번 이상 쌓이면 그래프로 보여요.</p>
      : <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${key === 'height' ? '키' : '몸무게'} 변화 ${values[0]}${unit}에서 ${values.at(-1)}${unit}`}>
        {medXY.length > 1 && <polyline className="growth-median" points={medXY.map((p) => p.join(',')).join(' ')} fill="none" strokeWidth="1.5" strokeDasharray="4 4" />}
        <polyline points={xy.map((p) => p.join(',')).join(' ')} fill="none" stroke="var(--accent, #0a84ff)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {xy.map(([x, y], i) => <circle key={points[i].date} cx={x} cy={y} r="3.5" fill="var(--card)" stroke="var(--accent, #0a84ff)" strokeWidth="2" />)}
        <text x={xy[0][0]} y={xy[0][1] + 20} textAnchor="start" className="growth-label">{values[0]}{unit}</text>
        <text x={xy.at(-1)[0]} y={xy.at(-1)[1] + 20} textAnchor="end" className="growth-label strong">{values.at(-1)}{unit}</text>
        <text x={P} y={H - 4} textAnchor="start" className="growth-axis">{points[0].date.slice(2).replaceAll('-', '.')}</text>
        <text x={W - P} y={H - 4} textAnchor="end" className="growth-axis">{points.at(-1).date.slice(2).replaceAll('-', '.')}</text>
      </svg>}
  </div>
}
