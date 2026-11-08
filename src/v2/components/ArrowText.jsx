import { ChevronsRight } from 'lucide-react'

// '» 17:00' 같은 글을 목록 시간과 같은 화살표 아이콘(글자 가운데 높이)으로
export default function ArrowText({ text }) {
  if (!text?.includes('» ')) return text
  const [before, after] = text.split('» ')
  return <span className="arrow-text">{before}<ChevronsRight className="inline-arrow" size={12} aria-label="까지" />{after}</span>
}
