# Codex 지시서 — 오늘우리 v2, 4단계 (설정·가족 연결 → 할 일)

경로 `/Users/santak/Documents/04_프로젝트/GitHub/family-scheduler`, `v2` 브랜치. 커밋은 v2에만, 푸시·배포는 Claude가 한다.
기준 기기 iPhone 16 Pro(393×852), 휴대폰 전용. 디자인 규칙은 STEP-3.md와 같다.

## 왜 설정이 먼저인가
미리보기(https://oneuluri.vercel.app)는 주소가 달라 기기 저장 데이터가 없고, v2에 가족 로그인 화면이 없어 **가족 일정이 하나도 안 보인다.** 사용자가 폰에서 확인할 수 있게 가족 연결부터 만든다.

## 1. 설정 탭 (최우선)
순서대로 한 화면 목록 → 항목 누르면 바텀시트.
1. **가족 연결**: 로그인(이메일·비밀번호)·회원가입·가족 만들기·초대 코드로 참여·연결 상태·권한(보기 전용/편집). 로직은 `useFamilySync`(signIn/signUp/createFamily/joinFamily/updatePermission 등) 그대로, 옛 `src/components/FamilySyncPanel.jsx`는 화면 참고만(복사 금지, 새 화면으로).
2. **가족 구성원**: 이름·캐릭터(dad/mom/big/little 중 선택, 아이콘으로 고르기)·대표색. 근무 유형·자녀 시간표·기념일 편집은 옛 `FamilySettingsPanel` 기능 그대로 옮기되 새 디자인.
3. **알림**: `usePushNotifications` 연결.
4. **백업·불러오기**: 내보내기(옛 앱과 같은 JSON 형식)·불러오기 전 미리보기(`inspectBackup`, F10)·최근 버전 복원(restoreVersion).
5. **앱 정보**: 버전.

## 2. 할 일 탭
- 한 목록 + 위쪽 분류 칩 필터(D8). 분류는 `taskCategories` 편집 가능(F5).
- 담당자 캐릭터 24px, 완료 체크 시 해당 캐릭터 '완료' 표정 잠깐.
- 반복 할 일(F5, `recurrence.js` 형식). 할 일 개수는 목록과 같은 함수(F7).
- 삭제는 확인창 없이 "되돌리기" 토스트 하나만(F8).

## 3. 앱 아이콘 교체
`design/icons/`의 `apple-touch-icon.png`(180)·`app-icon-192.png`·`app-icon-512.png`로 `public/`의 같은 이름 파일을 교체, `favicon-64.png`를 favicon으로 추가(manifest·index.html 링크 갱신). 옛 앱 아이콘 파일 이름은 그대로라 옛 앱도 같은 아이콘이 되는 점 보고서에 적기.

## 4. 3단계 잔여 수정
- 오늘 화면 가족 줄 상태 글이 잘림("영어 19:…"). 두 줄 허용 또는 시간만 아래 줄로. 글자 잘림 금지.

## 검증
- lint·build·v2 테스트·옛 앱 98개(진입점 임시 전환).
- 실제 백업으로 393×852 스크린샷: 설정 목록, 가족 연결 시트, 할 일 → `docs/v2/shots/`(커밋 금지).
- 로그인 흐름은 테스트 계정 없이 화면·오류 표시만 검사하고, 실제 로그인은 "미확인"으로 적는다(운영 계정으로 시험 금지).
- 결과 `docs/v2/STEP-4-REPORT.md`.
