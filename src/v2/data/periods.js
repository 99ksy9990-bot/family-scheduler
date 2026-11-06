const seasonOf = (v) => v === 'term' ? '학기' : v === 'vacation' ? '방학' : v // lib/schedule과 같은 규칙 (노드 테스트용으로 따로 둠)

const schoolYear = (iso) => { const [y, m] = iso.split('-').map(Number); return m >= 3 ? y : y - 1 }

// 학년·구분: 저장된 값(grade, term)이 있으면 그것, 없으면 시작 날짜와 학교 학년으로 추정
export function periodParts(period, school, today = new Date()) {
  if (period?.term) return { grade: period.grade ? Number(period.grade) : null, term: period.term }
  if (!period?.start) return { grade: null, term: seasonOf(period?.season) || '' }
  const month = Number(period.start.slice(5, 7))
  const term = seasonOf(period.season) === '방학' ? (month >= 5 && month <= 9 ? '여름방학' : '겨울방학') : month >= 3 && month <= 7 ? '1학기' : '2학기'
  const grade = Number(school?.grade)
  if (!grade) return { grade: null, term }
  const nowKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`
  const g = grade - (schoolYear(nowKey) - schoolYear(period.start))
  return { grade: g > 0 ? g : null, term }
}

// 기간 이름: "2학년 2학기", "5학년 겨울방학"
export function periodName(period, school, today = new Date()) {
  if (period?.name) return period.name
  const { grade, term } = periodParts(period, school, today)
  return grade ? `${grade}학년 ${term}` : term || '기간'
}
