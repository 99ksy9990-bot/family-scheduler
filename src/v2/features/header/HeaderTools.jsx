import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Bell, Search } from 'lucide-react'
import Sheet from '../../components/Sheet'
import CharacterAvatar from '../../components/CharacterAvatar'
import { ACTION_TEXT, getSeen, setSeen } from '../../data/activity'

const ago = (at, now) => { const m = Math.round((now - new Date(at)) / 60000); return m < 1 ? '방금' : m < 60 ? `${m}분 전` : m < 1440 ? `${Math.round(m / 60)}시간 전` : `${Math.round(m / 1440)}일 전` }
const shortDate = (d) => d ? `${Number(d.slice(5, 7))}월 ${Number(d.slice(8, 10))}일` : '날짜 없음'

const FILTERS = [['all', '모두'], ['event', '일정'], ['task', '할 일'], ['done', '완료']]
const FILTER_FN = { all: () => true, event: (x) => x.kind === 'event', task: (x) => x.kind === 'task' && x.action !== 'done', done: (x) => x.action === 'done' }

// 위쪽 알림·검색 버튼 (내리면 동그란 유리 버튼으로)
export default function HeaderTools({ state, now, onGoDate, onToday, todayNumber }) {
  const [open, setOpen] = useState('')
  const [query, setQuery] = useState('')
  const [seen, setSeenAt] = useState(getSeen)
  const [lastSeen, setLastSeen] = useState('') // 창 열기 전 본 시각: 그 뒤 소식에 파란 점
  const [filter, setFilter] = useState('all')
  const activity = state?.activity || []
  const profiles = state?.profiles || []
  const unread = activity.some((item) => item.at > seen)
  const openBell = () => { setOpen('bell'); setFilter('all'); setLastSeen(seen); const at = activity[0]?.at || ''; if (at) { setSeen(at); setSeenAt(at) } }
  const q = query.trim()
  const results = q ? [
    ...(state?.events || []).map((row) => ({ id: row.id, title: row.title, date: row.date, type: '일정' })),
  ].filter((row) => (row.title || '').includes(q)).toSorted((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 50) : []
  return <div className="header-tools">
    {onToday && <button className="header-tool today-tool" aria-label="오늘로" onClick={onToday}><span>{todayNumber}</span></button>}
    <button className="header-tool" aria-label="검색" onClick={() => setOpen('search')}><Search size={22} /></button>
    <button className="header-tool" aria-label={unread ? '알림, 새 소식 있음' : '알림'} onClick={openBell}><Bell size={22} />{unread && <i className="header-dot" />}</button>
    {open === 'bell' && createPortal(<Sheet title="알림" onClose={() => setOpen('')}>{activity.length ? <><div className="activity-filter" role="group" aria-label="소식 분류">{FILTERS.map(([id, label]) => <button key={id} aria-pressed={filter === id} onClick={() => setFilter(id)}>{label}</button>)}</div><ul className="activity-list">{activity.filter(FILTER_FN[filter]).map((item) => { const who = profiles.find((p) => p.id === item.by); return <li key={item.id} data-read={item.at <= lastSeen}>{who ? <CharacterAvatar profile={who} size={36} /> : <span className="activity-anon" />}<div><p><b>{who?.name || '가족'}</b>님이 {item.kind === 'task' ? '할 일' : '일정'} ‘{item.title}’ {ACTION_TEXT[item.action]}</p><small>{item.date ? `${shortDate(item.date)} · ` : ''}{ago(item.at, now)}</small></div>{item.at > lastSeen && <i className="activity-new" aria-label="새 소식" />}</li> })}</ul></> : <div className="empty-state"><h3>아직 소식이 없어요</h3><p>가족이 일정이나 할 일을 바꾸면 여기에 모여요.</p></div>}</Sheet>, document.body)}
    {open === 'search' && createPortal(<Sheet title="찾기" onClose={() => { setOpen(''); setQuery('') }}><input className="search-input" type="search" autoFocus placeholder="일정 이름" aria-label="일정 찾기" value={query} onChange={(event) => setQuery(event.target.value)} />
      {q && (results.length ? <ul className="search-results">{results.map((row) => <li key={row.id}><button onClick={() => { setOpen(''); setQuery(''); if (row.date) onGoDate(row.date) }}><span><b>{row.title}</b><small>{row.type}</small></span><small>{shortDate(row.date)}</small></button></li>)}</ul> : <p className="data-message">‘{q}’ 찾은 게 없어요.</p>)}</Sheet>, document.body)}
  </div>
}
