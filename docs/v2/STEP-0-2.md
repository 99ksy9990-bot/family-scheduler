# Codex 지시서 — 오늘우리 v2, 0~2단계

먼저 `REBUILD-PLAN.md` 전체를 읽는다. 이 문서는 그 중 0~2단계만 다룬다. 화면(UI)은 아직 만들지 않는다.

## 0단계 — 작업 공간
1. `main`에서 `v2` 브랜치를 만든다. `main`은 v2 배포 전까지 커밋 금지.
2. 기존 `src/`는 `legacy/src/`로 옮기지 말고 **그대로 둔 채**, 새 코드는 `src/v2/`에 만든다. 진입점만 `index.html` → `src/v2/main.jsx`로 바꾼다. (옛 코드는 참고·재사용용, 4단계 끝나면 삭제 계획을 따로 올린다)
3. 재사용 파일은 복사하지 말고 `src/lib/*`, `src/hooks/*`에서 직접 import 한다:
   `recurrence.js`, `holidays.js`, `dates.js`, `shiftSyncMerge.js`, `backup.js`, `colors.js`, `useFamilySync.js`, `usePushNotifications.js`, `useModalAccessibility.js`, `useToday.js`.
4. 사용자에게 받을 것: 운영 앱 설정 화면의 JSON 백업 파일 1개 → `tests/fixtures/real-backup.json` (**`.gitignore`에 추가, 커밋 금지** — 가족 개인정보).

## 1단계 — (Claude 담당, 대기) 디자인 시스템·캐릭터. Codex는 건드리지 않는다.

## 2단계 — 데이터 층
목표: v2가 옛 데이터를 하나도 잃지 않고 읽고, 옛 버전 앱과 같은 클라우드 행을 함께 써도 깨지지 않는다.

### 저장 위치 (변경 금지)
- 클라우드: `household_states.state` (jsonb 한 행), `version`으로 낙관적 잠금. 쓰기는 기존 `useFamilySync`의 경로 그대로.
- 기기: localStorage 키 11개 — `src/App.jsx:2350-2360`의 `usePersistedValue` 목록이 기준.

### 만들 것: `src/v2/data/migrate.js`
- `fromLegacy(state) → v2State`, `toLegacy(v2State) → state` 두 함수.
- 규칙: 기존 필드는 이름·의미·형식 **그대로 유지**, 새 필드는 **추가만**:
  - 일정 반복: `events[i].recurrence` (없으면 반복 없음, `src/lib/recurrence.js` 형식 재사용)
  - 담당자 여러 명: `events[i].assigneeIds` 배열 추가. 기존 단일 담당자 필드도 계속 채운다(첫 번째 값).
  - 할 일 반복: `tasks[i].recurrence`, 할 일 분류 편집: 최상위 `taskCategories` 배열(없으면 기존 3개 기본값).
  - 캐릭터: 멤버 프로필에 `characterId` 추가.
- 모르는 필드는 **지우지 말고 그대로 통과**시킨다 (옛 버전이 쓴 값 보존).
- 스키마 버전: 최상위 `v2SchemaVersion: 1`.

### 테스트 (필수, 통과 못 하면 3단계 진행 금지)
`tests/v2/migrate.spec.js` (Playwright 테스트 러너로 node 단위 실행):
1. 실제 백업으로 `fromLegacy` → 일정·할 일·근무·자녀 일정·기념일·예외 **개수 전부 동일**.
2. `toLegacy(fromLegacy(x))`가 원본 `x`와 깊은 비교로 같다(새 필드 제외).
3. 모르는 필드 `{"zzz": 1}` 보존.
4. 빈 상태 `{}` 처리.
실제 백업 파일이 없으면 1번은 건너뛰고 "skip: real-backup.json 없음"을 출력.

### 하지 말 것
- Supabase 마이그레이션 추가·수정 금지 (필요하면 이유를 적어 Claude 검수 요청).
- 새 라이브러리 추가 금지 (`date-holidays`는 빌드 스크립트 전용 유지).
- `main` 브랜치 푸시·배포 금지.

## 끝나면
`npm run lint`, `npm run build`, 마이그레이션 테스트 결과를 `docs/v2/STEP-2-REPORT.md`에 붙이고 Claude 검수 요청.
