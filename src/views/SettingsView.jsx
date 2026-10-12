import { useState } from 'react'
import { Bell, ChevronRight, Cloud, Download, Settings2, UserRoundCheck, Users } from 'lucide-react'

const PUSH_STATUS_COPY = {
  enabled: ['알림 사용 중', '이 기기에서 가족 일정 알림을 받습니다.'],
  enabling: ['알림 설정 중', '브라우저 알림 권한과 기기를 연결하고 있습니다.'],
  denied: ['알림 권한 차단됨', '브라우저 설정에서 알림 권한을 허용해 주세요.'],
  unsupported: ['알림 미지원', '이 브라우저에서는 백그라운드 알림을 사용할 수 없습니다.'],
  error: ['알림 확인 필요', '알림 설정을 다시 확인해 주세요.'],
  idle: ['알림 꺼짐', '가족 일정 알림을 이 기기에서 받아보세요.'],
}

export default function SettingsView({ appVersion, profiles, workSettings, sync, pushStatus, pushError, onOpenProfiles, onOpenFamily, onEnableNotifications }) {
  const [notificationHelpOpen, setNotificationHelpOpen] = useState(false)
  const activeProfiles = profiles.filter((profile) => profile.active !== false)
  const workerCount = activeProfiles.filter((profile) => workSettings.workerIds?.includes(profile.id)).length
  const connected = Boolean(sync.family)
  const syncState = connected
    ? sync.syncStatus === 'offline' ? '오프라인 저장 중'
      : sync.syncStatus === 'saving' || sync.syncStatus === 'connecting' ? '동기화 중'
        : sync.syncStatus === 'error' ? '동기화 확인 필요' : '가족 일정 동기화됨'
    : sync.session ? '가족방 연결 필요' : '로그인·가족 연결 필요'
  const [notificationTitle, notificationDetail] = PUSH_STATUS_COPY[pushStatus] || PUSH_STATUS_COPY.idle
  const notificationActionable = !['enabled', 'enabling', 'unsupported'].includes(pushStatus)
  const openNotificationAction = () => {
    if (pushStatus === 'denied') {
      setNotificationHelpOpen((current) => !current)
      return
    }
    if (notificationActionable) onEnableNotifications()
  }

  return (
    <div className="page settings-page">
      <section className="page-title-row settings-title-row">
        <div><span className="eyebrow">우리 가족과 앱 관리</span><h1>설정</h1><p>가족 구성, 연결, 근무표와 알림을 한곳에서 관리합니다.</p><small className="app-version">앱 버전 {appVersion}</small></div>
      </section>

      <div className="settings-hub-grid">
        <section className="settings-hub-card card">
          <div className="section-heading"><div><span className="eyebrow">가족과 근무</span><h2>가족 구성</h2><p>캘린더에 표시할 가족과 근무표를 설정합니다.</p></div><UserRoundCheck /></div>
          <div className="settings-hub-list">
            <button className="settings-hub-row" onClick={onOpenProfiles}>
              <span className="settings-hub-icon sky"><UserRoundCheck /></span>
              <span><strong>가족 구성원 관리</strong><small>{activeProfiles.length ? `${activeProfiles.length}명 등록됨` : '구성원을 먼저 등록해 주세요.'}</small></span>
              <ChevronRight />
            </button>
            <button className="settings-hub-row" onClick={onOpenProfiles}>
              <span className="settings-hub-icon sage"><Settings2 /></span>
              <span><strong>근무표 설정</strong><small>{workSettings.enabled && workerCount ? `${workerCount}명 사용 중` : '사용할 구성원과 근무 시간을 설정하세요.'}</small></span>
              <ChevronRight />
            </button>
          </div>
        </section>

        <section className="settings-hub-card card">
          <div className="section-heading"><div><span className="eyebrow">공유와 보관</span><h2>가족 연결</h2><p>다른 기기와 일정을 공유하고 데이터를 보관합니다.</p></div><Cloud /></div>
          <div className="settings-hub-list">
            <button className="settings-hub-row" onClick={onOpenFamily}>
              <span className={`settings-hub-icon ${connected ? 'connected' : 'lavender'}`}><Users /></span>
              <span><strong>가족 연결·동기화</strong><small>{connected ? `${sync.family.household.name} · ${sync.family.members.length}명 연결` : syncState}</small></span>
              <em className={connected ? 'success' : ''}>{syncState}</em>
              <ChevronRight />
            </button>
            <button className="settings-hub-row" onClick={onOpenFamily}>
              <span className="settings-hub-icon peach"><Download /></span>
              <span><strong>백업·불러오기</strong><small>일정을 저장하거나 이전 내용을 불러옵니다.</small></span>
              <ChevronRight />
            </button>
          </div>
        </section>

        <section className="settings-hub-card notification-settings-card card">
          <div className="section-heading"><div><span className="eyebrow">기기별 설정</span><h2>알림</h2><p>사용 중인 기기에서 가족 일정 알림을 받습니다.</p></div><Bell /></div>
          <button className={`settings-hub-row notification-row ${pushStatus === 'enabled' ? 'enabled' : ''}`} onClick={openNotificationAction} aria-disabled={!notificationActionable} aria-expanded={pushStatus === 'denied' ? notificationHelpOpen : undefined} aria-controls={pushStatus === 'denied' ? 'notification-permission-help' : undefined}>
            <span className="settings-hub-icon sky"><Bell /></span>
            <span><strong>{notificationTitle}</strong><small>{pushError || notificationDetail}</small></span>
            {notificationActionable ? (pushStatus === 'denied' ? <em>설정 방법 보기</em> : <ChevronRight />) : <em className={pushStatus === 'enabled' ? 'success' : ''}>{pushStatus === 'enabled' ? '사용 중' : '상태 확인'}</em>}
          </button>
          {pushStatus === 'denied' && notificationHelpOpen && <div id="notification-permission-help" className="notification-permission-help" role="region" aria-label="알림 권한 설정 방법">
            <strong>iPhone에서 알림을 다시 허용하려면</strong>
            <ol><li>홈 화면 앱: 설정 → 알림 → Family Scheduler → 알림 허용</li><li>Safari: 설정 → 앱 → Safari → 알림에서 이 사이트를 허용</li></ol>
            <small>설정을 바꾼 뒤 앱으로 돌아오면 알림 상태를 다시 확인합니다.</small>
          </div>}
        </section>
      </div>
    </div>
  )
}
