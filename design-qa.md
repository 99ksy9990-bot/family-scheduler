# Family Scheduler 오늘 일정·캘린더 액션 QA

- Source visual truth: `/tmp/codex-remote-attachments/019fcba5-e320-7763-bfd4-651660a025ea/2E67E86E-DC7E-4E30-B35B-7EDD3A12FC2E/1-사진-1.jpg`
- Home implementation screenshot: `/Users/santak/Downloads/stitch_/output/playwright/home-today-mobile.png`
- Calendar implementation screenshot: `/Users/santak/Downloads/stitch_/output/playwright/calendar-event-actions-mobile.png`
- Viewport: Codex in-app browser `402 × 874` CSS px, device scale factor 1
- Source pixels: `588 × 1280` px
- Implementation pixels: each `402 × 874` px
- State: 2026년 8월 11일, 엄마 E 근무가 있는 홈과 가족 일정이 있는 캘린더 상세
- Normalization: 브라우저 크롬이 포함된 기존 사용자 캡처는 카드 구성의 출발점으로 사용하고, 구현 캡처는 앱 콘텐츠를 동일한 모바일 폭에서 확인했다. 이번 요청에서 명시한 한 줄 읽기 전용 홈 카드와 제목 행 액션 배치는 의도적인 변경이다.

## Full-view comparison evidence

기존 홈 카드는 시간·유형, 아바타, 제목, 수정·삭제가 여러 행에 나뉘어 일정 내용 공간을 줄였다. 구현 화면은 `엄 → E · 오후 근무 · 오후 1:30~오후 10:30 → 근무` 순서로 한 줄에 배치하고 홈 수정·삭제를 제거했다. 캘린더 상세는 일정명 오른쪽에 수정·삭제를 붙여 전체·가족·자녀 모드가 같은 구조를 사용한다.

## Focused-region comparison evidence

- 홈 카드: DOM과 캡처에서 네 요소의 중심선이 같고, 카드 및 개별 요소의 가로 넘침이 없다. 홈 카드 내부 버튼 수는 0이다.
- 홈 요약: 네 버튼은 A2Z 11px이며 모두 같은 행에 있고 `402px` 화면에서 카드·버튼 모두 넘치지 않는다.
- 캘린더 상세: 메타 행의 액션 수는 0, 제목 행의 액션 그룹은 1이며 수정·삭제 두 버튼이 일정명과 같은 행에 있다.
- 긴 일정명: 제목은 남은 폭에서 말줄임되고 44px 수정·삭제 영역은 카드 안에 고정되어 모바일에서도 우측으로 넘치지 않는다.
- 빈 상태: 자녀 학교·학원 일정의 점선 박스는 제목 아래 17px 간격이며 안내 문장을 한 줄로 표시한다. 첫 가족 등록 안내도 짧은 한 줄 문장으로 통일했다.

## Required fidelity surfaces

- Fonts and typography: 기존 A2Z 계열을 유지했다. 홈 제목·시간·유형은 한 줄과 말줄임 규칙을 사용하고, 모바일 요약은 8px에서 11px로 확대했다.
- Spacing and layout rhythm: 홈 카드 높이를 줄이고 아바타·제목·시간·유형을 한 행의 네 열로 정렬했다. 캘린더 액션은 제목 행 오른쪽 끝에 고정했다.
- Colors and visual tokens: 구성원별 배경·좌측 선, 근무·자녀 유형 칩의 기존 의미 색상을 유지했다.
- Image quality and asset fidelity: 새 이미지나 대체 자산은 필요하지 않으며 기존 로고와 Lucide 아이콘을 그대로 사용했다.
- Copy and content: 근무 일정명은 근무 설정에서 파생한 `E · 오후 근무` 형식이며, 유형은 별도 `근무` 칩으로 유지했다.

## Comparison history

1. `[P2]` 첫 구현에서 공통 `.event-time`의 그리드 열 지정 때문에 시간 요소가 다음 행으로 이동했다.
2. 홈 전용 시간 요소의 그리드 열을 자동 배치로 재정의해 네 요소를 같은 행으로 복구했다.
3. 모바일 요약 글자가 여전히 작아 보여 A2Z 10px에서 11px로 확대하고 실제 폭에서 넘침을 재확인했다.
4. 후속 캡처와 DOM 측정에서 홈 한 줄 정렬, 무버튼 상태, 캘린더 제목 행 액션, 모바일 무넘침을 확인했다.
5. 긴 일정명과 44px 액션이 함께 있을 때 캘린더 카드가 밀리는 문제를 제목의 축소·말줄임과 카드 최대 폭 제한으로 보정했다.
6. 초기 가족 등록 및 자녀 학교·학원 빈 상태 안내를 모바일 한 줄로 확인하고 제목과 점선 박스 사이 간격을 17px로 통일했다.

## Findings

요청 범위에서 남은 P0, P1, P2 항목은 없다.

## Follow-up polish

없음.

final result: passed
