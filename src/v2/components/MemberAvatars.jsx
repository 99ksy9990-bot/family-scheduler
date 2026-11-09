import DayIcon from './DayIcon'
import CharacterAvatar from './CharacterAvatar'
import { membersFor } from '../data/members'
import { kindOf } from '../data/kinds'

// 일정 종류에 맞는 얼굴: 쉬는 날 휴식, 근무 바쁨, 학교·학원 공부, 병원 아픔, 생일 축하
const moodOf = (row) => {
  const kind = kindOf(row)
  if (row.title === '휴무' || /^휴무/.test(row.title || '') || kind === 'holiday') return 'rest'
  if (kind === 'shift' || /근무|출근|회의|출장/.test(row.title || '')) return 'busy'
  if (kind === '학교' || kind === '학원') return 'study'
  if (/병원|치과|검진|진료|한의원|예방접종/.test(row.title || '')) return 'sick'
  if (row.anniversary && !/제사|기일/.test(row.anniversaryKind || '')) return 'party' // 생일·기념일 축하
  return undefined
}

export default function MemberAvatars({ item, profiles }) {
  const members = membersFor(item, profiles).slice(0, 4)
  if (!members.length) return <DayIcon kind={item.holiday ? 'holiday' : item.anniversaryKind} />
  if (members.length === 1) return <CharacterAvatar profile={members[0]} expression={moodOf(item)} size={40} />
  return <span className="member-stack" role="img" aria-label={members.map((profile) => profile.name).join(' · ')} data-count={members.length}>{members.map((profile, index) => <span key={profile.id} style={{ left: members.length === 3 && index === 2 ? 6 : index % 2 * 12, top: members.length === 2 ? 6 : Math.floor(index / 2) * 12 }}><CharacterAvatar profile={profile} expression={moodOf(item)} size={20} /></span>)}</span>
}
