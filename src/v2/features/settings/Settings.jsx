import { lazy, Suspense } from 'react'
import { Bell, ChevronRight, Cloud, Download, Info } from 'lucide-react'
import Sheet from '../../components/Sheet'
import CharacterAvatar from '../../components/CharacterAvatar'
import { GroupedList, GroupedRow } from '../../components/GroupedList'
import { usePushNotifications } from '../../../hooks/usePushNotifications'

const Connection = lazy(() => import('./Connection'))
const Family = lazy(() => import('./Family'))
const Backup = lazy(() => import('./Backup'))
const entries = [['connection', '가족 연결', Cloud], ['family', '가족 구성원', Info], ['notifications', '알림', Bell], ['backup', '백업·불러오기', Download], ['about', '버전', Info]]
const pushLabels = { enabled: '알림 사용 중', enabling: '알림 연결 중', denied: '알림 권한이 차단되어 있어요', unsupported: '이 브라우저는 알림을 지원하지 않아요', idle: '알림 꺼짐', error: '알림 연결을 확인해 주세요' }

export default function Settings({ state, updateState, canEdit, sync, selected, onSelect, onPerson }) {
  const push = usePushNotifications({ session: sync.session, family: sync.family })
  const descriptions = { connection: sync.family ? `${sync.family.household.name} · ${canEdit ? '편집 가능' : '보기 전용'}` : sync.session ? '가족방을 연결해 주세요' : '로그인하고 가족 일정을 불러오세요', family: `${state.profiles.filter((profile) => profile.active !== false).length}명 · 캐릭터·근무·자녀 일정·기념일`, notifications: pushLabels[push.status], backup: 'JSON 저장·미리보기·버전 복원', about: `버전 ${import.meta.env.VITE_APP_VERSION || 'local'}` }
  const panel = selected?.startsWith('profile:') ? 'family' : selected
  const groups = [['연결', ['connection']], ['앱', ['notifications', 'backup']], ['정보', ['about']]]
  return <section className="family-page" aria-label="가족 목록">
    <div className="family-section-heading"><h2 className="house-section-title">구성원</h2><button className="text-button" aria-label="가족 구성원 관리" onClick={() => onSelect('family')}>관리</button></div><GroupedList label="구성원">{state.profiles.filter((profile) => profile.active !== false).map((profile) => <GroupedRow key={profile.id} icon={<CharacterAvatar profile={profile} size={32} />} title={profile.name} subtitle={state.workSettings.workerIds?.includes(profile.id) ? '근무표 있음' : state.childSchedules.some((schedule) => schedule.member === profile.id || schedule.members?.includes(profile.id)) ? '시간표 있음' : profile.relation} value={<ChevronRight size={18} />} onClick={() => onPerson(profile.id)} />)}

    </GroupedList>
    {groups.map(([heading, ids]) => <section key={heading}><h2 className="house-section-title">{heading}</h2><GroupedList label={heading}>{ids.map((key) => {
      const [id, title, Icon] = entries.find(([id]) => id === key)
      return <GroupedRow key={id} className="settings-entry" icon={<span className="settings-color-icon" data-icon={id}><Icon size={20} /></span>} title={title} subtitle={descriptions[id]} value={<ChevronRight size={18} />} onClick={() => onSelect(id)} />
    })}</GroupedList></section>)}
    {selected && <Sheet title={entries.find(([id]) => id === panel)[1]} onClose={() => onSelect(null)}><Suspense fallback={<p role="status">설정을 불러오고 있어요…</p>}>
      {panel === 'connection' && <Connection sync={sync} state={state} updateState={updateState} canEdit={canEdit} />}
      {panel === 'family' && <Family initialProfile={selected?.startsWith('profile:') ? selected.slice(8) : null} state={state} updateState={updateState} canEdit={canEdit} />}
      {panel === 'backup' && <Backup state={state} updateState={updateState} canEdit={canEdit} sync={sync} />}
      {panel === 'notifications' && <div className="settings-content"><p>{pushLabels[push.status]}</p>{!sync.family && <p>먼저 가족 연결을 완료해 주세요.</p>}{push.status === 'denied' && <p>기기 설정의 알림에서 우리집의 알림 권한을 허용한 뒤 다시 열어 주세요.</p>}<button onClick={push.enable} disabled={['enabling', 'enabled', 'unsupported', 'denied'].includes(push.status)}>이 기기 알림 켜기</button>{push.error && <p role="alert" className="error">{push.error}</p>}</div>}
      {panel === 'about' && <div className="settings-content"><h3>우리집</h3><p>버전 {import.meta.env.VITE_APP_VERSION || 'local'}</p><p>우리 가족의 하루를 함께 기록해요.</p></div>}
    </Suspense></Sheet>}
  </section>
}
