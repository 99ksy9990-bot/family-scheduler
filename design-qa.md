# 선택한 날짜 일정 카드 QA

- Source visual truth: `C:\Users\99ksy\.codex\codex-remote-attachments\019fd144-df0c-7670-a5d2-0447c45631d2\06DF34BB-4E11-4485-A41A-DE42DC32918F\1-사진-1.jpg`
- Implementation screenshot: `C:\Users\99ksy\Documents\패밀리 스케줄러\qa-selected-date-mobile.png`
- Comparison image: `C:\Users\99ksy\Documents\패밀리 스케줄러\qa-selected-date-comparison.png`
- Viewport: 393 x 852 CSS px
- Source pixels: 588 x 1280, normalized to 393 x 852
- Implementation pixels: 378 x 819 from the in-app browser capture, normalized to 393 x 852
- State: 캘린더 > 일반 > 2026년 8월 5일 선택

## Full-view comparison evidence

모바일 캘린더에서 선택 날짜 패널, 일정 카드, 범례, 하단 내비게이션을 함께 확인했다. 패널은 350.29px 폭이고 첫 카드의 `scrollWidth`와 `clientWidth`가 모두 303px로 가로 넘침이 없다.

## Focused region comparison evidence

선택 날짜 패널만 잘라 동일한 393 x 852 기준으로 정규화해 비교했다. 사용자 요청에 맞게 일정 카드 첫 줄은 담당자 배지, 시간, 구분점, 장소 순서로 배치되고 제목은 다음 줄에 표시된다. 현재 검증 데이터에서는 `기 종일 · 매년 양력 8월 5일`로 렌더링되며, 가족 일정 데이터에는 동일한 구조로 `가 종일 · 청송`이 표시된다.

## Findings

- P0/P1/P2 없음.
- Fonts and typography: 기존 A2Z 글꼴과 크기 계층을 유지했고 메타 정보와 제목이 분리되어 읽기 쉽다.
- Spacing and layout rhythm: 메타 행과 제목 행이 7px 간격으로 분리되며 393px 폭에서 겹침과 잘림이 없다.
- Colors and visual tokens: 기존 담당자 색상, 카드 배경, 강조색 토큰을 그대로 사용했다.
- Image quality and asset fidelity: 새 이미지 자산을 추가하지 않았고 기존 아이콘과 담당자 배지를 재사용했다.
- Copy and content: 데이터 필드 순서는 `누가 언제 · 어디서 / 무엇을`이다.
- Browser console errors: 없음.

## Comparison history

- Initial reference: 시간은 왼쪽, 담당자 배지는 오른쪽, 장소는 제목 아래에 있었다.
- Fix: 선택 날짜 카드에만 `calendarSummary` 변형을 적용해 담당자, 시간, 장소를 첫 줄로 이동하고 제목을 다음 줄로 배치했다.
- Post-fix evidence: DOM 순서와 393 x 852 모바일 캡처에서 새 구조, 줄 분리, 무가로넘침을 확인했다.

## Primary interactions tested

- 하단 `캘린더` 탭 이동
- 날짜 선택 후 선택 날짜 패널 자동 노출
- 선택 날짜 일정 카드와 수정/삭제 버튼 렌더링

final result: passed
