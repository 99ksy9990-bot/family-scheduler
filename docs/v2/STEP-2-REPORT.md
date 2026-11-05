# 오늘우리 v2 — 0·2단계 결과 및 Claude 검수 반영

작성일: 2026-11-05
작업 폴더: `/Users/santak/Documents/04_프로젝트/GitHub/family-scheduler`
브랜치: `v2` (`main`에서 생성)

## 최종 구현

- 기존 src를 보존하고 index.html 진입점만 `src/v2/main.jsx`로 변경.
- v2 진입점은 화면 미연결 상태라 빈 화면이 정상. 1단계 디자인·캐릭터 및 3단계 화면은 작업하지 않음.
- `tests/fixtures/real-backup.json`은 .gitignore로 제외. 실제 파일은 아직 없음.
- Supabase·의존성 목록·잠금 파일·기존 tests/app.spec.js는 변경하지 않음.
- 기존 `.hallmark/`, `.serena/`, `design/`는 커밋 대상에서 제외.

## 검수 수정 1 — 기존 담당자 구조 사용

`src/v2/data/migrate.js`에서 별도 담당자 배열 생성·변환을 제거했다. 기존 `members`와 `member`를 형식 그대로 통과시킨다. 관련 새 필드 테스트도 제거하고, 기존 단일·여러 담당자 필드가 왕복 후 동일한지 검사한다.

`fromLegacy`는 원본을 복제하고 `v2SchemaVersion: 1`, 누락된 `taskCategories` 기본값(긴급·장보기·집안일), 미선택 `characterId: null`만 추가한다. 기존 반복 규칙·캐릭터·분류·모르는 필드는 유지한다. `toLegacy`는 추가 필드를 포함한 상태 전체를 복제한다.

## 검수 수정 2 — 초기 데이터 정리 공용화

`src/lib/legacyState.js`로 기존 App.jsx의 실제 함수·상수·초기 불러오기 순서를 이동했다. 원본 위치에서 제거하고 import하므로 정리 규칙을 중복 구현하지 않았다.

- `loadLegacyState`: 기존 localStorage 11개 키를 같은 순서와 기본값으로 읽음.
- `migrateMemberProfiles`: 기존 색상·프로필 정리 함수 직접 사용.
- `defaultWorkSettingsFor`: 저장된 근무 구성원으로 근무 설정 기본값 계산.
- `normalizeEventCalendarScopes`: 자녀 구성원 기준 달력 분류 보정.
- `loadWithoutLegacySeeds`: 기존 일정·할 일·자녀 일정·학기 시드 제거.
- 기존 미아 생일 → 연두 생일 보정 및 자녀 정보 기본값 유지.
- 기존 RECOVERED_SHIFTS/ANNIVERSARIES 병합·복구 버전 확인 유지. 현재 두 복구 배열은 원래처럼 비어 있음.
- `upgradeSharedState`도 같은 공용 파일로 이동. 기존 클라우드 정리 동작 유지.
- 기존 앱은 공용 초기 상태를 한 번 읽고 각 React 상태에 연결.
- v2 `readLegacyStorage`도 공용 함수를 사용. `persistRecovery: false`로 기기 저장소에 쓰지 않음. 기존 앱은 기본값 true로 기존 복구 표시값 저장 동작 유지.
- `persistence.js`는 저장소를 선택 인자로 받을 수 있게 확장. 기존 호출의 기본값은 localStorage로 유지.
- 손상 JSON은 기존 앱처럼 기본값으로 복구. 이전 구현의 오류 발생 방식은 제거.

## 검증

```text
npm run lint
종료 코드 0

npx playwright test --config tests/v2/playwright.config.js
Running 8 tests using 1 worker
skip: real-backup.json 없음
1 skipped
7 passed (276ms)
```

단위 검증: 컬렉션 개수·왕복 깊은 비교·원본 불변·알 수 없는 필드·빈 상태·기존 반복/분류/캐릭터/담당자 유지, 시드 제거·이름 보정·달력 분류·근무 설정·자녀 정보 기본값, 구버전/v2 공용 결과 일치, 복구 표시값 기록 여부, 손상 JSON, 클라우드 구형 상태 보정 및 최신 상태 재보정 방지.

기존 앱 회귀 검사는 기존 `tests/app.spec.js`와 기존 Playwright 설정을 사용한다. 검사 동안만 index.html을 기존 src/main.jsx로 연결하고, 종료 시 finally에서 v2 진입점으로 복원한다. 첫 시도는 Playwright 테스트 브라우저 실행 파일 누락으로 실패하여 `npx playwright install chromium` 설치 후 재실행했다.

최종 결과:

```text
npx playwright test tests/app.spec.js
Running 106 tests using 2 workers
8 skipped
98 passed (29.7s)
종료 코드 0

npm run build  # v2 진입점 복원 후
종료 코드 0, dist/sw.js 생성

git diff --check
종료 코드 0

git check-ignore tests/fixtures/real-backup.json
tests/fixtures/real-backup.json
```

기존 앱 테스트 파일은 수정하지 않았다. index.html의 `/src/v2/main.jsx` 복원을 확인했다. main은 기존 `df080e136b24073f7479f4d9b083745259ab21f4`를 유지한다.

## 남은 범위

- 실제 백업 개수 검사는 파일 미확보로 skip. 확보 후 같은 단위 검사 명령 재실행 필요.
- 운영 클라우드 동시 저장·낙관적 잠금 실연동은 미검증. 기존 쓰기 경로·DB는 변경하지 않음.
- v2 화면은 아직 없음. 배포하지 않음.
- 설치된 기존 의존성의 감사 항목과 빌드의 inlineDynamicImports 경고는 이번 수정 범위 밖으로 유지.
- v2에서만 커밋하며 푸시는 하지 않음. main 커밋·푸시·운영 배포 없음.
