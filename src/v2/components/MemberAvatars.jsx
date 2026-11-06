import CharacterAvatar from './CharacterAvatar'
import { membersFor } from '../data/members'

export default function MemberAvatars({ item, profiles }) {
  const members = membersFor(item, profiles).slice(0, 4)
  if (!members.length) return <span className="schedule-symbol" aria-label={item.holiday ? '공휴일' : '기념일'}>✦</span>
  if (members.length === 1) return <CharacterAvatar profile={members[0]} size={32} />
  return <span className="member-stack" role="img" aria-label={members.map((profile) => profile.name).join(' · ')} data-count={members.length}>{members.map((profile, index) => <span key={profile.id} style={{ left: members.length === 3 && index === 2 ? 6 : index % 2 * 12, top: members.length === 2 ? 6 : Math.floor(index / 2) * 12 }}><CharacterAvatar profile={profile} size={20} /></span>)}</span>
}
