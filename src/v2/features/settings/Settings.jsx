import { lazy, Suspense, useState } from 'react'
import { Bell, ChevronRight, Cloud, Download, Info, Users } from 'lucide-react'
import Sheet from '../../components/Sheet'
import { usePushNotifications } from '../../../hooks/usePushNotifications'

const Connection = lazy(() => import('./Connection'))
const Family = lazy(() => import('./Family'))
const Backup = lazy(() => import('./Backup'))
const entries = [['connection', '가족 연결', Cloud], ['family', '가족 구성원', Users], ['notifications', '알림', Bell], ['backup', '백업·불러오기', Download], ['about', '앱 정보', Info]]
const pushLabels = { enabled: '알림 사용 중', enabling: '알림 연결 중', denied: '알림 권한이 차단되어 있어요', unsupported: '이 브라우저는 알림을 지원하지 않아요', idle: '알림 꺼짐', error: '알림 연결을 확인해 주세요' }

export default function Settings({ state, updateState, canEdit, sync }) {
  const [selected, setSelected] = useState(null)
  const push = usePushNotifications({ session: sync.session, family: sync.family })
  const descriptions = { connection: sync.family ? `${sync.family.household.name} · ${canEdit ? '편집 가능' : '보기 전용'}` : sync.session ? '가족방을 연결해 주세요' : '로그인하고 가족 일정을 불러오세요', family: `${state.profiles.filter((profile) => profile.active !== false).length}명 · 캐릭터·근무·자녀 일정·기념일`, notifications: pushLabels[push.status], backup: 'JSON 저장·미리보기·버전 복원', about: '우리집 버전 정보' }
  return <section className="settings-content" aria-label="설정 목록">
    {entries.map(([id, title, Icon]) => <button key={id} className="settings-entry" onClick={() => setSelected(id)}><Icon size={24} aria-hidden="true" /><span><strong>{title}</strong><small>{descriptions[id]}</small></span><ChevronRight size={20} aria-hidden="true" /></button>)}
    {selected && <Sheet title={entries.find(([id]) => id === selected)[1]} onClose={() => setSelected(null)}><Suspense fallback={<p role="status">설정을 불러오고 있어요…</p>}>
      {selected === 'connection' && <Connection sync={sync} state={state} updateState={updateState} canEdit={canEdit} />}
      {selected === 'family' && <Family state={state} updateState={updateState} canEdit={canEdit} />}
      {selected === 'backup' && <Backup state={state} updateState={updateState} canEdit={canEdit} sync={sync} />}
      {selected === 'notifications' && <div className="settings-content"><p>{pushLabels[push.status]}</p>{!sync.family && <p>먼저 가족 연결을 완료해 주세요.</p>}{push.status === 'denied' && <p>기기 설정의 알림에서 우리집의 알림 권한을 허용한 뒤 다시 열어 주세요.</p>}<button onClick={push.enable} disabled={['enabling', 'enabled', 'unsupported', 'denied'].includes(push.status)}>이 기기 알림 켜기</button>{push.error && <p role="alert" className="error">{push.error}</p>}</div>}
      {selected === 'about' && <div className="settings-content"><h3>우리집</h3><p>버전 {import.meta.env.VITE_APP_VERSION || 'local'}</p><p>우리 가족의 하루를 함께 기록해요.</p></div>}
    </Suspense></Sheet>}
  </section>
}
