# Family Scheduler 종일 표시·일정 액션 크기 QA

- Source visual truth: `/var/folders/8l/51nrjkvx1cvcwlxhcj_0w4g80000gn/T/TemporaryItems/NSIRD_screencaptureui_zMyaPN/스크린샷 2026-08-11 오후 4.20.34.png`, `/var/folders/8l/51nrjkvx1cvcwlxhcj_0w4g80000gn/T/TemporaryItems/NSIRD_screencaptureui_iBJaOs/스크린샷 2026-08-11 오후 4.21.00.png`
- Home implementation screenshot: `/Users/santak/Downloads/stitch_/output/playwright/qa-home-mobile-actions.png`
- Calendar implementation screenshot: `/Users/santak/Downloads/stitch_/output/playwright/qa-calendar-mobile-actions.png`
- Viewport: Codex in-app browser `402 × 874` CSS px, device scale factor 1
- Source pixels: `588 × 1280` px
- Implementation pixels: each `402 × 874` px
- State: 2026년 8월 11일, 엄마 E 근무가 있는 홈과 가족 일정이 있는 캘린더 상세
- Normalization: 브라우저 크롬이 포함된 기존 사용자 캡처는 카드 구성의 출발점으로 사용하고, 구현 캡처는 앱 콘텐츠를 동일한 모바일 폭에서 확인했다. 이번 요청에서 명시한 한 줄 읽기 전용 홈 카드와 제목 행 액션 배치는 의도적인 변경이다.

## Full-view comparison evidence

오늘의 일정에서 시간 지정 일정은 `아바타 → 제목 · 시간 → 유형`으로 표시하고, 종일 일정은 `아바타 → 제목 → 유형`만 남겨 불필요한 `종일` 문구를 제거했다. 캘린더와 일정 관리의 수정·삭제는 기존 모바일 44px 버튼에서 32px 버튼과 15px 아이콘으로 축소했다.

## Focused-region comparison evidence

- 홈 카드: 시간 지정 일정은 제목 뒤 시간까지 한 줄이며, 종일 일정에는 구분점과 시간 요소가 생성되지 않는다. 카드 내부 버튼 수는 0이다.
- 홈 요약: 상단 구분선을 유지하고 `가족 n / 근무 n / 자녀 n / 할 일 n`을 이번 주 일정 셀과 같은 밝은 배경·검은 글자·얇은 테두리로 통일했다. 네 버튼은 A2Z 11px이며 모두 같은 행에 있고 `402px` 화면에서 넘치지 않는다.
- 캘린더 상세: 메타 행의 액션 수는 0, 제목 행의 액션 그룹은 1이며 수정·삭제 두 버튼이 일정명과 같은 행에 있다. 아이폰 16 Pro 폭에서 버튼은 32px, 아이콘은 15px, 투명 터치 여백은 사방 6px이다.
- 긴 일정명: 제목은 남은 폭에서 말줄임되고 축소된 수정·삭제 영역은 카드 안에 고정되어 모바일에서도 우측으로 넘치지 않는다.
- 빈 상태: 자녀 학교·학원 일정의 점선 박스는 제목 아래 17px 간격이며 안내 문장을 한 줄로 표시한다. 첫 가족 등록 안내도 짧은 한 줄 문장으로 통일했다.

## Required fidelity surfaces

- Fonts and typography: 기존 A2Z 계열을 유지했다. 홈 일정명과 시간은 PC 15px·모바일 13px로 같은 크기를 사용하되 시간은 일반 굵기 400을 유지하고, 모바일 요약은 11px이다.
- Spacing and layout rhythm: 홈의 종일 일정은 시간 자리를 제거해 제목 폭을 확보했다. 캘린더와 일정 관리 액션은 작은 시각 크기와 별도의 투명 터치 여백을 사용한다.
- Colors and visual tokens: 구성원별 배경·좌측 선, 근무·자녀 유형 칩의 기존 의미 색상을 유지했다.
- Image quality and asset fidelity: 새 이미지나 대체 자산은 필요하지 않으며 기존 로고와 Lucide 아이콘을 그대로 사용했다.
- Copy and content: 근무는 `E · 시간`, 일반·자녀 일정은 `제목 · 시간`을 사용하고, 종일 일정은 시간 문구를 표시하지 않는다.

## Comparison history

1. `[P2]` 첫 구현에서 공통 `.event-time`의 그리드 열 지정 때문에 시간 요소가 다음 행으로 이동했다.
2. 홈 전용 시간 요소의 그리드 열을 자동 배치로 재정의해 네 요소를 같은 행으로 복구했다.
3. 모바일 요약 글자가 여전히 작아 보여 A2Z 10px에서 11px로 확대하고 실제 폭에서 넘침을 재확인했다.
4. 제목과 시간 사이에만 `·`를 두고 양쪽 간격을 3px로 고정했다. 유형 칩은 오른쪽 끝에 유지하고, 하단 요약은 네 개의 독립 버튼으로 시각적 클릭 가능성을 강화했다.
5. 후속 캡처와 DOM 측정에서 홈 한 줄 정렬, 무버튼 상태, 캘린더 제목 행 액션, 모바일 무넘침을 확인했다.
6. 긴 일정명과 44px 액션이 함께 있을 때 캘린더 카드가 밀리는 문제를 제목의 축소·말줄임과 카드 최대 폭 제한으로 보정했다.
7. 초기 가족 등록 및 자녀 학교·학원 빈 상태 안내를 모바일 한 줄로 확인하고 제목과 점선 박스 사이 간격을 17px로 통일했다.
8. 종일 일정의 시간 요소를 조건부로 제거하고, 모바일 액션 버튼을 32px로 축소한 뒤 아이폰 16 Pro 폭에서 가로 넘침이 0임을 확인했다.
9. 오늘 요약 네 칩의 카테고리별 색상을 제거하고 동일 배경과 동일 글자색으로 맞춰 이번 주 일정 셀과 시각적 톤을 통일했다.
10. 오늘 일정 시간의 서체는 유지하면서 일정명과 같은 글자 크기로 맞추고, 모바일의 고정 최대폭을 제거해 종료 시간까지 표시되도록 했다.

## Findings

요청 범위에서 남은 P0, P1, P2 항목은 없다.

## Follow-up polish

없음.

final result: passed
