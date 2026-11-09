import { useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import Sheet from './Sheet'

// 달력과 같은 "11월 2026년 ⌄" 머리: 누르면 달 고르기 창
export default function MonthHead({ month, onChange }) {
  const [year, setYear] = useState(null)
  const now = new Date()
  return <>
    <button type="button" className="month-head" aria-label={`${month.getFullYear()}년 ${month.getMonth() + 1}월, 다른 달 고르기`} onClick={() => setYear(month.getFullYear())}><b>{month.getMonth() + 1}월</b><span className="app-date">{month.getFullYear()}년</span><ChevronDown size={18} className="month-caret" /></button>
    {year && createPortal(<Sheet title="달 고르기" onClose={() => setYear(null)}><div className="year-row"><button className="month-arrow" aria-label="이전 해" onClick={() => setYear(year - 1)}><ChevronLeft size={22} /></button><b>{year}년</b><button className="month-arrow" aria-label="다음 해" onClick={() => setYear(year + 1)}><ChevronRight size={22} /></button></div><div className="month-pick">{Array.from({ length: 12 }, (_, m) => <button key={m} aria-pressed={year === month.getFullYear() && m === month.getMonth()} data-now={year === now.getFullYear() && m === now.getMonth()} onClick={() => { onChange(new Date(year, m, 1)); setYear(null) }}>{m + 1}월</button>)}</div></Sheet>, document.body)}
  </>
}
