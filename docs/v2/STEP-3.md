# Codex 지시서 — 오늘우리 v2, 3단계 (오늘·달력 화면)

경로: `/Users/santak/Documents/04_프로젝트/GitHub/family-scheduler`, `v2` 브랜치. 먼저 `REBUILD-PLAN.md` 5·6·9장을 읽는다.

## 디자인 재료 (Claude 확정, 수정 금지)
- 토큰: `design/system/tokens.css`, `base.css` (Hallmark Hum 테마, app 범위). `src/v2/styles/`로 **복사해서** import. 값 수정이 필요하면 Claude에게 요청.
  - 글꼴 SUITE. 다른 기기엔 없으므로 `public/fonts/`에 SUITE woff2(Regular 400·SemiBold 600·Bold 700, 한글 2350자+영숫자 서브셋)를 넣고 `@font-face` + `font-display: swap`. 출처: https://github.com/sun-typeface/SUITE (OFL 라이선스).
  - 숫자는 전부 고정폭: `body { font-variant-numeric: tabular-nums }` (SUITE `tnum` 지원 확인됨).
  - 가족 색: `--color-dad / --color-mom / --color-big / --color-little`.
- 캐릭터 아이콘 12개: `design/characters/icons/{dad,mom,big,little}_{basic,busy,done}.png` (256px, 배경 투명) → `public/characters/`로 복사, 가능하면 WebP로 변환해 함께 둔다.
  - 프로필 `characterId`(dad·mom·big·little)로 연결. 없는 프로필은 이름 첫 글자 동그라미.
  - 표정 규칙: 기본=평소, 바쁨=지금 근무·일정 진행 중, 완료=그날 일정·할 일 끝.

## 화면
공통 껍데기: 하단 탭 5개(오늘·달력·할 일·가족·설정), **라벨 항상 표시**, 터치 영역 44px 이상. 할 일·가족·설정 탭은 이번엔 "준비 중" 빈 화면.
`+` 버튼 → 바텀시트(일정 추가 폼은 옛 앱 필드 그대로, 저장은 기존 상태 형식).

### 오늘
1. 맨 위: 가족 4명 캐릭터 줄 + 각자 지금 상태 한 줄(예: "근무 D 06:30–15:30", "피아노 16:00"). 표정은 규칙대로.
2. 바로 아래: 오늘 일정 타임라인(시간순, 근무·자녀 일정·일반 일정·기념일·공휴일 통합). **첫 화면(iPhone 16 Pro 393×852)에 첫 일정이 보여야 함**(D1).
3. 시간 표기 하나로 통일: `HH:MM`, 24시간(L3). 자녀 일정 시간순 정렬(L1).
4. 일정 개수는 달력과 같은 함수로 계산(L2·F7 재발 금지).

### 달력
1. 월/주 전환(F2), "오늘" 버튼(F6).
2. 날짜 탭 → 바텀시트로 그날 일정(D2). 오늘=숫자 강조, 선택=채운 배경(D7). 공휴일=칸 배경 색(D5).
3. PC(1024px 이상): 달력 + 선택일 일정 2단(D10).

### 상태 4종
데이터 영역마다 로딩·빈 상태(할 일 1개와 추가 버튼)·오류·정상. 빈 상태 카드는 작게(D3).

## 재사용 (복사 금지, import)
`src/lib/{dates,holidays,recurrence,legacyState,shiftSyncMerge}.js`, `src/hooks/{useFamilySync,useToday,useModalAccessibility}.js`, `src/v2/data/migrate.js`.
날짜 계산 로직이 옛 `src/App.jsx` 안에만 있으면(예: `eventsForDate`) `src/lib/`로 옮겨 옛 앱과 함께 쓴다. 옮긴 뒤 옛 앱 테스트 98개 재통과 필수.

## 규칙
- 파일 하나 300줄 이하, 화면별 `src/v2/features/{today,calendar}/`.
- 색·글꼴은 토큰만(직접 색 값 금지), 이모지를 아이콘으로 쓰지 않음, 대문자·자간 넓힌 라벨 금지, 모든 버튼 `:focus-visible`, 움직임 줄이기 설정 존중, `transition: all` 금지.
- 새 라이브러리 추가 금지. `main` 커밋·푸시 금지.

## 검증 (끝나기 전 직접)
- `npm run lint`, `npm run build`, v2 테스트, 옛 앱 테스트(진입점 임시 전환 방식).
- 실제 백업 `tests/fixtures/real-backup.json`(있음, 커밋 금지)을 불러온 상태로 iPhone 16 Pro(393×852)와 PC(1920×945) 스크린샷 → `docs/v2/shots/` (스크린샷은 커밋하지 말 것 — 가족 정보).
- 결과는 `docs/v2/STEP-3-REPORT.md`. 확인 못 한 것은 "미확인"으로 적는다.
