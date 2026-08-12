# Codex 작업 프롬프트 — Family Scheduler 디자인 시스템 통일

아래 내용을 그대로 Codex에 붙여넣으세요.

---

## 컨텍스트

`family-scheduler` 레포에서 작업합니다. React 19 + Vite 8 + 순수 CSS(Tailwind 없음), 상태는 `localStorage` + Supabase JSONB 동기화입니다.

- 진입점: `src/App.jsx` (2,190줄 — 뷰 대부분이 이 파일에 인라인)
- 컴포넌트: `src/components/`
- 스타일: `src/styles.css` (1,470줄, 단일 파일)
- 테스트: `tests/app.spec.js` (Playwright 17개)
- 검증: `npm run lint` → `npm run build` → `npm run test:e2e`

**작업 중 지켜야 할 것**

1. `npm run lint`는 경고 0을 유지합니다.
2. `tests/app.spec.js`의 기존 17개 테스트를 깨뜨리지 마세요. 셀렉터를 바꾸면 테스트도 함께 갱신하세요.
3. Tailwind나 CSS-in-JS를 도입하지 마세요. 기존 순수 CSS 방식을 따릅니다.
4. 한글 UI 문구는 그대로 유지하고, 새로 추가하는 문구도 한국어로 씁니다.
5. 데이터 모델은 아래 명시된 마이그레이션 외에는 바꾸지 마세요.
6. 각 Phase가 끝날 때마다 lint + build를 돌리고 커밋하세요. 한 번에 몰아서 커밋하지 마세요.

---

## 해결하려는 문제

**문제 1 — 같은 데이터가 화면마다 다른 레이아웃으로 나옵니다.**
홈의 `.child-row`, 캘린더 상세의 `EventCard`, 할 일의 `.task-card`가 각자 마크업과 높이를 들고 있습니다. `.task-card`는 `min-height: 104px`이고, `EventCard`는 시간과 제목을 두 줄로 쪼개서 카드 하나가 100px을 넘습니다. 모바일에서 4개만 있어도 화면이 꽉 찹니다.

**문제 2 — 색이 두 가지를 동시에 말합니다.**
지금 색이 사람(엄/연/초/아)도 뜻하고 분류(긴급/장보기/집안일, 근무/자녀)도 뜻합니다. 사용자는 초록을 보고 "장보기인가, 연두인가"를 매번 재해석해야 합니다.

**문제 3 — 구성원 팔레트 6색 중 3개가 청록 계열입니다.**
`src/components/FamilySettingsPanel.jsx:6`
```js
const PROFILE_COLORS = ['#7fc7e3', '#c9df84', '#ffaaa0', '#6fb0a8', '#6f97d8', '#8bcdb4']
//                       하늘        연두        코랄        청록        블루       민트
```
하늘·청록·민트가 4px 컬러바나 범례 점 크기로 줄어들면 구분이 불가능합니다.
추가로 `#ffaaa0`(엄마 코랄)이 `#e06b65`(공휴일, `App.jsx:36`)와 거의 같은 톤이라 달력에서 엄마 일정인지 공휴일인지 헷갈립니다.

---

## Phase 0 — 모달 스크롤 구조 (이미 고쳤다면 건너뛰세요)

`src/styles.css`의 `@media (max-width: 660px)` 블록에 다음이 있습니다.

```css
.modal-actions { position: sticky; bottom: -22px; ... }
```

모바일에서 `.modal`에 `max-height`도 `overflow`도 없어서, sticky의 기준 스크롤 조상이 `.modal`이 아니라 `.modal-backdrop`(`overflow-y: auto`)입니다. 결과적으로 버튼이 뷰포트 하단에 고정되고 폼 전체가 그 뒤로 흘러갑니다. "추가 설정"을 펼치면 시간·장소 입력란이 버튼 뒤로 잘립니다.

**본문에 패딩을 더하는 방식으로 고치지 마세요.** 그건 마지막 항목만 구제하고 중간 항목은 계속 뒤로 지나갑니다.

**모달 자신을 스크롤 컨테이너로 만드세요.** 같은 패턴이 이미 `src/styles.css`의 `.search-panel`에 있으니 그대로 따르세요.

```css
.search-panel { max-height: min(820px, calc(100vh - 32px)); overflow: hidden; display: flex; flex-direction: column; }
```

`.modal`을 flex 컬럼으로 만들고, 폼 본문을 스크롤 영역으로 감싸고, `.modal-actions`는 `position: sticky` 없이 flex 푸터로 두세요.

**함께 처리할 것**

- `vh` → `dvh`. iOS Safari의 `vh`는 동적 툴바와 키보드를 반영하지 않습니다. `styles.css`에서 `calc(100vh - 32px)`을 쓰는 4곳(`.family-sync-panel`, `.search-panel`, `.collaboration-panel`, `.family-settings-panel`)을 모두 `dvh`로 바꾸세요.
- 하단 내비게이션 안전 여백을 변수 하나로 통일하세요.
  ```css
  :root { --nav-safe: calc(64px + env(safe-area-inset-bottom)); }
  ```
  모바일에서 `main`의 `padding-bottom`에 적용합니다. 지금 할 일 화면 마지막 카드가 하단 내비에 잘립니다.

**검증**: 320 / 390 / 402 / 430px 폭에서 일정 추가 모달의 추가 설정을 펼쳤을 때 모든 입력란에 도달 가능하고 버튼이 항상 보일 것. Playwright 테스트로 추가하세요.

---

## Phase 1 — 색 토큰 분리와 마이그레이션

### 1-1. 토큰 파일 신설

`src/lib/colors.js`를 새로 만듭니다.

```js
// 구성원 색 — 색상환에서 충분히 벌린 6색. 빨강·주황 계열은 시스템 예약이라 제외.
export const MEMBER_COLORS = [
  { id: 'blue',     color: '#3B82F6', tone: '#EFF6FF' },
  { id: 'cyan',     color: '#0891B2', tone: '#ECFEFF' },
  { id: 'green',    color: '#10B981', tone: '#ECFDF5' },
  { id: 'lime',     color: '#65A30D', tone: '#F7FEE7' },
  { id: 'violet',   color: '#8B5CF6', tone: '#F5F3FF' },
  { id: 'pink',     color: '#EC4899', tone: '#FDF2F8' },
]

// 시스템 예약색 — 구성원에게 배정 금지
export const SYSTEM_COLORS = {
  holiday:     '#DC2626',  // 공휴일·일요일
  anniversary: '#F59E0B',  // 기념일
  family:      '#24657E',  // 가족 공용 (브랜드 네이비, 특정 사람이 아니므로 유채색 불필요)
  danger:      '#DC2626',  // 삭제·경고. 면적 없이 선으로만 사용
}
```

### 1-2. 기존 정의 교체

- `FamilySettingsPanel.jsx:6-7`의 `PROFILE_COLORS` / `PROFILE_TONES`를 `MEMBER_COLORS`로 교체
- `App.jsx:28` `FAMILY_MEMBER.color` → `SYSTEM_COLORS.family`
- `App.jsx:35` `ANNIVERSARY_MEMBER.color` → `SYSTEM_COLORS.anniversary`
- `App.jsx:36` `HOLIDAY_MEMBER.color` → `SYSTEM_COLORS.holiday`

### 1-3. 마이그레이션 (놓치면 안 되는 부분)

**구성원의 `color` / `tone`은 프로필 객체에 값으로 저장돼 있습니다.** `localStorage`의 `family-scheduler-profiles-v1`과 Supabase 동기화 상태(`sharedState.profiles`) 양쪽에 들어 있습니다. `MEMBER_COLORS` 상수만 바꾸면 **신규 선택에만 적용되고 기존 가족은 코랄 엄마를 그대로 유지합니다.**

`App.jsx`의 `upgradeSharedState()`에 마이그레이션을 추가하세요.

- `schemaVersion`을 5 → 6으로 올립니다.
- `schemaVersion < 6`이면 각 프로필의 `color`를 기존 색과 색상 거리가 가장 가까운 `MEMBER_COLORS` 항목으로 매핑하되, **이미 배정된 색은 건너뛰어 중복이 나지 않게** 합니다.
- 매핑 결과가 결정적(deterministic)이어야 합니다. 프로필 배열 순서를 기준으로 순회하세요. 같은 입력에 항상 같은 출력이 나와야 여러 기기에서 동기화 충돌이 안 납니다.
- `tone`도 함께 갱신합니다.

로컬 전용 상태(`load('family-scheduler-profiles-v1', ...)`) 경로에도 같은 마이그레이션이 걸리는지 확인하세요.

### 1-4. 토요일 파랑 처리

지금 토요일 숫자가 파랑인데 구성원 팔레트에도 블루가 있습니다. **토요일 숫자를 진회색으로 내리고 블루는 구성원용으로 유지하세요.** 토요일은 위치로 알 수 있지만 사람 색 하나가 줄어드는 건 확장성 손해가 큽니다.
`styles.css`의 `.saturday` 색을 `#376fc3` → 진회색(`#4c575d` 계열)으로 변경. 일요일 빨강(`SYSTEM_COLORS.holiday`)은 그대로 둡니다.

### 1-5. 분류 칩 무채색화

"근무"(연두), "자녀"(하늘색) 등 **분류를 뜻하는 색을 전부 무채색으로 내리세요.** 회색 배경 + 진한 회색 글씨 + 아이콘으로 구분합니다. 정보 손실은 없습니다.

대상: `.overview-marker.family`, `.overview-marker.children`, 할 일 카테고리(`.task-group.urgent` / `.housework` / `.groceries`)의 색상.
단 **긴급**은 예외로 `SYSTEM_COLORS.danger`를 유지합니다 — 경고성 신호이므로 규칙에 맞습니다.

### 1-6. 색 선택 UI

`FamilySettingsPanel`의 색 선택에서:

- 이미 다른 구성원이 쓰는 색은 **비활성 + `"아빠 사용 중"` 라벨** 표시. 자유 선택으로 두면 언젠가 반드시 중복이 납니다.
- 6명을 초과하면 팔레트가 소진됩니다. 그때는 색을 재사용하되 **배지 이니셜로 구분**하고, 목록에 `"초롱과 같은 색"` 안내를 노출하세요.

### 1-7. 규칙 문서화

`src/lib/colors.js` 상단에 주석으로 네 줄 규칙을 명시하세요.

```
색 = 사람 / 아이콘 = 분류 / 회색 = 나머지 전부 / 빨강 = 경고
```

---

## Phase 2 — Avatar 규격 통일

현재 `.avatar-small`이 `38×38px`, `border-radius: 13px`인 **둥근 사각형**입니다(`styles.css:311`). 할 일 화면에서는 이게 버튼처럼 보여서 누를 수 있는 것으로 오인됩니다.

`src/App.jsx`의 `Avatar` 컴포넌트를 다음 규격으로 통일하세요.

- 원형 `28×28px` 고정 (`border-radius: 50%`)
- 테두리 `1.5px solid var(--member)`
- 폰트 `13px / 700`
- 배경은 `var(--member-tone)`, 글자색은 `var(--member)`
- **크기 변형(`small` prop)을 없애고 모든 화면에서 동일한 크기**를 씁니다. 화면마다 크기가 달라서 같은 사람인지 인지가 늦어지는 게 현재 문제입니다.
- `AvatarGroup`의 겹침(`margin-left: -8px`)은 유지하되 새 크기에 맞춰 조정하세요.

`small` prop을 제거하면 호출부가 여러 곳입니다. 전부 정리하세요.

**색각 이상 대응**: 색만으로 구분하지 말고 배지 이니셜을 항상 함께 노출합니다. 이미 그렇게 돼 있으니 유지만 하면 됩니다.

---

## Phase 3 — 공용 `ScheduleRow` 컴포넌트

`src/components/ScheduleRow.jsx`를 새로 만들고, 아래 세 곳의 마크업을 전부 이것으로 교체하세요.

| 위치 | 현재 |
|---|---|
| `App.jsx` `EventCard` (532줄) | 시간·제목 2줄, 100px 초과 |
| `App.jsx` `.child-row` (홈 자녀 일정) | 자체 마크업 |
| `App.jsx` `.task-card` (1190줄 부근) | `min-height: 104px` |

**규격 — 홈 화면의 한 줄형을 기준으로 통일합니다.** 셋 중 스캔이 가장 빠르고 높이가 가장 낮습니다.

- 높이 고정 `56px`
- 좌측 컬러바 `4px` (구성원 색)
- 내부 패딩 `12px 14px`
- 구조: `[배지] [제목 · 시간] ————— [카테고리 칩]`
- **행 배경은 흰색.** 지금은 행 전체가 연한 색으로 칠해져 있어서 색 면적이 너무 넓고, 그래서 정작 강조할 것이 안 튑니다. 색은 좌측 컬러바 4px와 배지 테두리에만 씁니다.
- 시간과 제목을 두 줄로 쪼개지 마세요.

**Props 설계**: 세 화면의 요구사항이 조금씩 다릅니다. 일정에는 시간·장소, 할 일에는 체크박스·마감일, 근무에는 근무 코드가 붙습니다. 슬롯 형태(`leading`, `trailing`, `meta`)로 받거나 `variant` prop으로 구분하되, **높이 56px과 컬러바·배지·패딩 규격은 variant와 무관하게 고정**되어야 합니다.

제목이 길면 `text-overflow: ellipsis`로 자르고 툴팁으로 전체를 노출하세요.

---

## Phase 4 — 행 액션을 바텀시트로

현재 연필·휴지통 아이콘이 항상 노출돼 오른쪽 40%를 차지하고, 터치 영역이 44px에 못 미쳐 오탭이 납니다.

**행 전체를 탭 → 바텀시트**로 바꾸세요. 스와이프나 롱프레스보다 PWA에서 안정적이고 발견성이 높습니다.

- 바텀시트 항목: `수정` / `삭제` / (할 일이면) `완료`
- **인라인에 남길 건 체크박스 하나뿐입니다.** 완료 처리는 가장 빈번한 동작이라 즉시 눌려야 하고, 삭제는 실수 여지가 있어 한 단계 숨기는 게 맞습니다.
- 삭제는 기존 `AppDialogProvider`(`src/components/AppDialogProvider.jsx`)의 확인 다이얼로그를 재사용하세요. 새 확인 UI를 만들지 마세요.
- 반복 일정·반복 할 일은 기존 `RecurringActionDialog` / `RecurringTaskDialog`로 연결되는 흐름을 유지하세요.
- 바텀시트에도 `useModalAccessibility`(`src/hooks/useModalAccessibility.js`)를 적용합니다.

**함께 고칠 접근성 결함**: 현재 모달을 Escape로 닫으면 포커스가 트리거 버튼이 아니라 `document.activeElement === BODY`로 빠집니다. `useModalAccessibility`에 **닫을 때 원래 트리거로 포커스를 복귀**시키는 로직을 추가하세요. 이건 실기기 없이 Playwright로 검증 가능합니다.

---

## 검증

각 Phase 종료 시:

```bash
npm run lint && npm run build && npm run test:e2e
```

**추가할 Playwright 테스트**

1. 320 / 390 / 402 / 430px에서 일정 모달 추가 설정을 펼쳤을 때 마지막 입력란이 보이고 버튼과 겹치지 않을 것
2. 홈·캘린더 상세·할 일 세 화면의 행 높이가 모두 56px일 것
3. 모든 `.avatar`의 계산된 크기가 28×28px일 것
4. 구성원 색이 서로 중복되지 않고 `SYSTEM_COLORS` 값과도 겹치지 않을 것
5. 모달을 Escape로 닫은 뒤 포커스가 트리거 버튼으로 복귀할 것
6. 기존 데이터(구 팔레트 색을 가진 프로필)를 로드했을 때 마이그레이션이 새 팔레트로 결정적으로 매핑할 것

---

## 하지 말 것

- 시간 데이터 모델(`time: '오후 9:00'`, `'종일'` 문자열)을 건드리지 마세요. 별도 작업입니다.
- `App.jsx`를 뷰 단위로 쪼개는 리팩터를 이 작업에 섞지 마세요. `ScheduleRow` 추출만 합니다.
- 월 그리드 셀 안에 일정 제목을 더 많이 노출하지 마세요.
- 한글 폰트 서브셋을 건드리지 마세요.
- 기능을 추가하지 마세요. 이 작업은 전부 표현 계층입니다.
