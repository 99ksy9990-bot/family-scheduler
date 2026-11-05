# 오늘우리 v2 — 3단계 결과

작성일: 2026-11-05 / 브랜치: v2 / Claude 검수 요청

## 최종 범위

사용자의 추가 지시를 우선 반영했다.

- 휴대폰 전용. 기준 화면 393×852, 위·아래 안전 영역 적용.
- 넓은 화면도 최대 480px 가운데 정렬. 오늘·달력의 PC 2단 배치 및 선택일 고정 패널 제거.
- 하단 탭: **오늘 · 달력 · 할 일 · 놀이 · 설정**. 라벨 항상 표시.
- 할 일·놀이·설정은 준비 중 화면. 가족 관리는 설정 안에 준비한다는 안내만 제공.
- GAMES.md는 참고만 했으며 게임·게임 점수 필드는 구현하지 않음.
- v2에서만 커밋. 푸시·배포 없음. 실제 백업·스크린샷은 커밋 제외.

## 구현

### 화면과 저장

- `src/v2/App.jsx`: 공통 껍데기·5개 탭·일정 추가 진입.
- `features/today/Today.jsx`: 활성 가족 줄, 상태별 캐릭터, 오늘 일정 타임라인.
- `features/calendar/Calendar.jsx`: 월/주 전환, 오늘 복귀, 날짜 선택 바텀시트.
- `components/EventForm.jsx`: 기존 일정 필드 형태로 제목·시작/종료일·종일/시간·장소·담당자·분류·반복·알림 저장. 종료일·종료 시간 검증.
- `components/Sheet.jsx`: 기존 useModalAccessibility 재사용, 초점 가두기·Escape 닫기·초점 복귀.
- `components/Timeline.jsx`: 시간순 목록과 로딩/빈/오류/정상 표시. 빈 상태에는 떠 있는 + 버튼 사용 안내.
- `data/useScheduler.js`: 공용 초기 정리·변환 함수 사용, 기존 11개 기기 저장 키 유지, 300ms 지연 저장, 기존 useFamilySync 경로 사용. 읽기 전용 가족은 추가 차단.
- 저장 실패 재시도 시 메모리의 현재 일정을 유지해 아직 저장하지 못한 변경을 다시 저장하도록 함.

### 일정 계산 공용화

- 기존 App.jsx의 기념일·자녀 일정·날짜별 일정 계산 함수를 `src/lib/schedule.js`로 이동. 기존 App.jsx도 같은 함수를 import하며 복사본 없음.
- `src/v2/data/schedule.js`가 위 공용 함수 결과에 근무를 합치고 24시간 표기로 정렬. 오늘과 달력 모두 `scheduleForDate` 사용.
- 야간 근무의 다음 날 00:00부터 종료 시각까지 이월 표시. 반복 일정·반복 예외·기념일·공휴일 포함.
- 기존 날짜·공휴일·반복·초기 정리·오늘 날짜 훅 재사용. shiftSyncMerge는 기존 useFamilySync 내부 경로를 그대로 사용.
- 달력 날짜별 결과는 Map으로 계산해 셀 개수와 선택일 목록이 같은 결과를 사용.
- Node 단위 검사를 위해 공휴일 JSON import에 `with { type: 'json' }` 명시. 데이터 내용은 변경하지 않음.

### 디자인·자료

- 확정 `design/system/tokens.css`, `base.css`를 `src/v2/styles/`에 그대로 복사. 바이트 동일성 확인.
- SUITE Regular 400·SemiBold 600·Bold 700을 공식 저장소에서 받아 woff2 서브셋 생성. KS X 1001 한글 2350자·영숫자·기본 문장부호·한글 자모 포함. 총 약 350KB. 세 파일 모두 tnum 유지 확인.
- `font-display: swap`, body 숫자 고정폭 적용. 출처: https://github.com/sun-typeface/SUITE / 라이선스 `public/fonts/SUITE-LICENSE.txt`.
- 확정 캐릭터 PNG 12개 복사 및 무손실 WebP 12개 생성. characterId가 없으면 이름 첫 글자 표시.
- 바쁨/기본/완료 상태 계산과 이미지 연결. 실제 백업의 네 프로필은 검수 후 사용자 확정 id 매핑으로 캐릭터를 기본 연결한다. 기존 선택값은 유지하며 다른 id는 이름 첫 글자를 표시한다.
- 화면 색·글꼴은 확정 토큰 사용. 새 버튼 최소 44px, 초점 표시, 동작 줄이기 설정 존중.
- 페이지 제목·PWA 이름은 오늘우리. 오프라인 캐시에 WebP도 포함하도록 빌드 설정 확장.
- 새 v2 코드·스타일 및 새 공용 일정 파일은 각각 300줄 이하.

## 검사 결과

```text
npm run lint
종료 코드 0

npx playwright test --config tests/v2/playwright.config.js
12 passed (284ms)
실제 백업 검사 포함, skip 없음

npx playwright test --config tests/v2/ui.config.js
12 passed (5.1s)
검사 서버 시작 시 npm run build 성공

npx playwright test tests/app.spec.js
98 passed (29.2s)
8 skipped (기존 테스트의 제외 조건 유지)
종료 코드 0
```

기존 앱 검사는 index.html 진입점을 검사 중에만 src/main.jsx로 전환하고 finally에서 src/v2/main.jsx로 복원했다. 기존 tests/app.spec.js를 수정하지 않았다. 기존 함수 이동 이후 98개 재통과 확인.

v2 화면 검사는 393×852(안전 영역 위 59px·아래 34px)와 넓은 화면에서의 480px 가운데 정렬을 대상으로 수행했다. 첫 일정 노출·다섯 탭·캐릭터 연결·24시간 표기·개수 일치·월/주·오늘 복귀·날짜 시트·Escape/초점 복귀·저장/새로고침·입력 검증·공휴일 배경·44px 날짜 버튼·빈/오류/재시도·오프라인 화면/글꼴/캐릭터를 검사했다. 넓은 화면용 별도 배치는 없음.

`git diff --cached --check`도 통과했다. 백업·스크린샷의 Git 제외 및 확정 토큰 복사본의 바이트 동일성을 확인했다.

빌드에는 기존 PWA inlineDynamicImports 폐기 예정 경고가 있으나 성공했다. date-holidays는 앱에서 import하지 않음.

## 실제 백업 화면 확인

Ego 브라우저의 격리된 로컬 미리보기에 실제 백업을 넣고 화면을 직접 확인했다. 원본 백업 파일과 운영 데이터는 수정하지 않았다.

- 393×852, 안전 영역 위 59px·아래 34px 모의 적용.
- 첫 일정 하단 약 508px, 하단 메뉴 시작 약 736px: 첫 일정이 메뉴 위에 완전히 보임.
- 가로 넘침 없음. 날짜 버튼 최소 폭 약 44.14px.
- 오늘 일정 6개와 달력 선택일 시트 6개 일치.
- 최종 탭에서 놀이 준비 중 확인.
- 검수 후 today/calendar 2장은 다시 저장하고 직접 열어 확인했다. 아래 4장 중 day-sheet/play는 초기 검증 기록이다. 모두 393×852이며 Git에서 제외. PC 스크린샷은 남기지 않음.

```text
docs/v2/shots/iphone-today.png
docs/v2/shots/iphone-calendar.png
docs/v2/shots/iphone-day-sheet.png
docs/v2/shots/iphone-play.png
```

## 미확인·다음 단계

- 실제 iPhone의 Safari/PWA 설치·키보드·노치 장치 동작: 미확인. Chromium의 화면 크기·안전 영역 모의 검사까지 수행.
- 운영 계정의 클라우드 동시 저장·권한·충돌 실연동: 미확인. 기존 훅과 쓰기 경로를 유지했으며 운영 계정에는 접속하지 않음.
- 실제 푸시 알림 전달: 미확인. 이번 폼은 기존 알림 필드만 저장함.
- 할 일·가족 관리·설정 상세와 미니 게임은 이번 단계 범위 밖.
- 실제 백업·스크린샷, Claude가 수정 중인 기획 문서·디자인 원본·도구 폴더는 이 구현 커밋에 포함하지 않음.

Claude는 최종 탭 구성·안전 영역 화면·공용 일정 계산·기존 앱 회귀 결과를 검수해 주세요.


## 검수 반영

Claude 검수 및 사용자 확인에 따른 3건을 반영했다.

1. 기본 캐릭터 연결: `fromLegacy`에서 characterId가 없거나 null일 때만 david→dad, emma→mom, leo→big(큰딸 초롱), mia→little(작은딸 연두) 적용. 기존 선택값은 유지하고 다른 id는 null. 알 수 없는 id·기존 선택·null·빈 문자열·원본 불변·재변환 테스트 추가. 실제 백업 왕복 검사도 재통과.
2. 상단 축소: 화면 제목과 저장 상태만 한 줄로 표시. 브랜드 블록·중복 날짜/제목·좋은 하루 문구·상단 추가 버튼 제거. 일정 추가는 하단 탭 위 오른쪽의 56px 원형 + 버튼 하나로 통일. 최대 480px 가운데 정렬과 안전 영역 유지.
3. 캐릭터 강조: 공용 `CharacterAvatar` 추가. 가족 카드 이미지 72×72px, 대표색 토큰 테두리, 상태 문구 한 줄. 일정 행 담당자 이름 옆 이미지 24×24px. 알 수 없는 캐릭터·이미지 오류는 이름 첫 글자로 표시.

재검증:

```text
npm run lint: 성공
npx playwright test --config tests/v2/playwright.config.js: 12 passed (284ms)
npx playwright test --config tests/v2/ui.config.js: 12 passed (5.1s)
위 화면 검사 시작 과정의 npm run build: 성공
git diff --check: 성공
```

화면 검사에 72px/24px 크기·단일 추가 버튼·인사말 삭제 검증을 추가했다. 빈 상태에서도 일정 추가 버튼은 하나임을 확인했다. 이번 수정은 v2 파일만 대상으로 하며 기존 공용 함수·구버전 앱은 바꾸지 않았다. 기존 앱 98개 통과는 앞선 3단계 검사 결과이다.

실제 백업을 넣은 Ego 브라우저에서 안전 영역 위 59px·아래 34px, 화면 393×852로 재촬영:

- `docs/v2/shots/iphone-today.png`
- `docs/v2/shots/iphone-calendar.png`

네 가족 캐릭터 모두 실제 이미지 로딩 성공. 가족 이미지 72px·일정 담당자 이미지 24px 확인. 헤더 하단 약 115px(안전 영역 포함), 첫 일정 하단 약 508px, 하단 탭 시작 약 736px. 추가 버튼 1개, 가로 넘침 없음. 두 파일을 직접 열어 화면 확인했으며 Git에서 계속 제외한다.

v2에만 커밋하며 푸시·배포하지 않는다. 실제 iPhone Safari·운영 클라우드 실연동은 여전히 미확인.
