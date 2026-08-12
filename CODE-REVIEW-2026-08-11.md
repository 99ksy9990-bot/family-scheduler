# Family Scheduler 코드 검토 — 2026-08-11

검토 범위: `src/` (4,632줄), `supabase/migrations`, `public/`, 빌드 설정, 의존성.
결론: 기능·DB 보안은 견고함. 병목은 **번들/폰트 용량**, **의존성 버전 고정**, **날짜 처리 버그** 세 가지.

---

## P0 — 지금 고쳐야 할 것

### 1. JS 번들 1.9MB (gzip 388KB) — 원인은 `date-holidays`
`import Holidays from 'date-holidays'`가 전 세계 200여 개국 공휴일 데이터를 통째로 번들에 넣습니다(패키지 11MB). 실제로 쓰는 건 `new Holidays('KR')` 하나.

- 한국 공휴일은 규칙이 단순하고(양력 고정일 + 설·추석 + 대체공휴일) 이미 `korean-lunar-calendar`로 음력 계산을 직접 하고 있습니다. `holidaysForYear()` 안의 `getHolidays()` 호출만 자체 테이블로 대체하면 됨.
- 예상 효과: 번들 **1.9MB → 200KB 미만** (gzip 60KB대). 모바일 첫 로딩 체감이 가장 크게 바뀌는 항목.

### 2. 폰트 5MB, 전부 TTF
`public/fonts`에 A2Z 6종 + KIMM 1종, 개당 680~900KB. `@font-face`에 `font-display`도 없어 로딩 중 텍스트가 안 보입니다(FOIT).

- **woff2 변환**: 한글 TTF 기준 보통 60~70% 감소.
- **서브셋**: 앱이 쓰는 한글은 상용 2,350자면 충분. 서브셋 + woff2면 폰트당 100KB 이하까지 내려갑니다.
- **가중치 정리**: Light/Regular/Medium/SemiBold/Bold/ExtraBold 6종을 다 쓰는지 확인 — 3종이면 충분한 경우가 많습니다.
- 최소 조치라도: 모든 `@font-face`에 `font-display: swap` 추가.

### 3. `package.json` 의존성 8개가 `"latest"`
```json
"react": "latest", "vite": "latest", "lucide-react": "latest", "eslint": "latest" ...
```
설치 시점마다 다른 버전이 깔립니다. 현재 설치본은 Vite 8(Rolldown 기반) + ESLint 10 + React 19.2.8 — 어느 것도 `package.json`엔 기록되어 있지 않습니다. **실제로 이 검토 중 `npm run build`가 rolldown 네이티브 바이너리 문제로 실패**했습니다. 배포 재현성이 없는 상태입니다.

→ 현재 설치된 버전으로 전부 핀 고정(`^19.2.8` 등)하고 `package-lock.json`을 함께 커밋.

### 4. `const today = new Date()` — 모듈 로드 시점 고정
`src/App.jsx:47`. 33곳에서 참조됩니다. PWA는 홈 화면에 설치해두고 며칠씩 열어두는 사용 패턴이라, **자정이 지나도 '오늘'이 갱신되지 않습니다.** 홈 화면의 오늘 일정, 기념일 D-day, 기본 날짜값이 전부 어제 기준으로 남습니다.

→ `today`를 state로 올리고 자정 타이머 또는 `visibilitychange` 시 재계산.

---

## P1 — 구조적 문제

### 5. Supabase 자격증명 하드코딩 fallback
`src/lib/supabase.js`에 프로젝트 URL과 publishable key가 소스에 그대로 커밋되어 있습니다. RLS 정책이 잘 짜여 있어(아래 참조) 데이터 유출 위험은 낮지만, 누구나 이 프로젝트에 가입해 계정·가구를 생성할 수 있습니다.

→ 환경변수 필수화(`supabaseEnabled = false`로 graceful degradation)하고 Supabase 대시보드에서 가입 도메인 제한 또는 초대 전용 설정 검토.

### 6. `App.jsx` 1,999줄 단일 파일
뷰 7개(Home/Calendar/Tasks/Schedules/Settings/Search/Modal) + 날짜 헬퍼 + 공휴일 로직 + 상태 마이그레이션이 한 파일에 있습니다. `src/components/`엔 4개만 분리되어 있고요.

→ 최소한 `views/`, `lib/dates.js`, `lib/holidays.js`, `lib/persistence.js`로 분리. 코드 스플리팅으로 초기 번들도 줄어듭니다.

### 7. PWA인데 서비스워커에 캐싱이 없음
`public/sw.js`는 `push`와 `notificationclick`만 처리합니다. 매니페스트·아이콘·`standalone` 설정은 다 갖췄는데 **오프라인에서 앱이 뜨지 않습니다.** `useFamilySync`가 offline 상태를 정성껏 다루고 있는 것에 비해 아쉬운 부분.

→ 앱 셸 precache(`index.html` + 해시된 JS/CSS + 폰트) + navigation fallback 추가. `vite-plugin-pwa`면 설정 몇 줄.

### 8. 전체 가족 상태를 JSONB 한 행으로 동기화
`sharedState` 전체를 `save_household_state_v2`로 왕복시킵니다. 낙관적 락 + 충돌 UI가 잘 구현돼 있어 현재 규모에선 문제없지만, 일정이 수천 건이 되면 편집 한 번마다 전체 상태를 직렬화·전송·비교하게 됩니다. 이력 테이블도 매 저장마다 행이 쌓입니다(30개 제한은 걸려 있음).

→ 당장 조치는 불필요. 다만 `stableStringify`를 매 렌더 비교에 쓰는 부분은 상태가 커지면 메인 스레드를 잡습니다. 장기적으로는 컬렉션별 테이블 분리 검토.

### 9. localStorage 쓰기 디바운스 없음
`App.jsx:1808~1818`의 `useEffect` 11개가 각 상태 변경마다 `JSON.stringify` + 동기 쓰기를 합니다. 폼 입력 중 매 키 입력마다 발생.

---

## P2 — 품질·유지보수

| 항목 | 현황 | 제안 |
|---|---|---|
| 테스트 | 0개 | Playwright를 이미 QA에 쓰고 있으니 스모크 테스트 5~6개만 커밋 |
| CI | 없음 | GitHub Actions로 `lint` + `build`만이라도 |
| ErrorBoundary | 없음 | 한 곳 렌더 에러 = 흰 화면. 최상단에 하나 |
| `window.confirm/alert` | 10곳 | 앱 디자인과 이질적이고 iOS 스탠드얼론에서 어색. 자체 다이얼로그로 |
| 모달 접근성 | `role="dialog"`/`aria-modal`은 잘 붙음 | Escape 닫기, 포커스 트랩, 닫을 때 포커스 복귀가 없음 |
| 리포 위생 | QA 스크린샷 40여 장, 구버전 `family-scheduler/` 폴더가 트래킹됨 | 별도 브랜치나 `.gitignore`로 정리 |
| `vite.config.js` | 파일 자체가 없음 | manualChunks·빌드 옵션을 조절할 지점이 없음 |

---

## 잘 되어 있는 것

- **RLS 설계**: 모든 테이블 RLS 활성, 헬퍼 함수는 `security definer` + `set search_path = ''`, 권한은 `authenticated`에 최소 부여, 쓰기는 전부 RPC 경유. 교과서적입니다.
- **동기화 로직**: 버전 기반 낙관적 락, 충돌 감지 후 "로컬 유지 / 원격 수용" 선택 UI, 오프라인 복귀 시 컨텍스트 재로드까지 구현돼 있습니다.
- **데이터 마이그레이션**: `schemaVersion`/`recoveryVersion`으로 레거시 시드 제거와 스키마 업그레이드를 안전하게 처리.
- **Undo**: 삭제 작업 전반에 되돌리기 토스트가 일관되게 붙어 있음.
- **ESLint 통과**: 경고 0.

---

## 권장 착수 순서

1. `date-holidays` 제거 → 번들 1.9MB → 200KB (반나절)
2. 의존성 버전 핀 고정 → 빌드 재현성 확보 (30분)
3. 폰트 woff2 + 서브셋 + `font-display: swap` (반나절)
4. `today` 자정 갱신 버그 (1시간)
5. 서비스워커 캐싱 → 실제 오프라인 지원 (반나절)
6. `App.jsx` 분리 + 코드 스플리팅 (1~2일)
