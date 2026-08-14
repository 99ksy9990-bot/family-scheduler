# Family Scheduler 일정 행·클릭 관리 QA

- Primary reference: `/var/folders/8l/51nrjkvx1cvcwlxhcj_0w4g80000gn/T/codex-clipboard-6ca0193f-bbfe-474a-a69f-67951fb81a2c.png`
- Action-row reference: `/var/folders/8l/51nrjkvx1cvcwlxhcj_0w4g80000gn/T/TemporaryItems/NSIRD_screencaptureui_mGQCJg/스크린샷 2026-08-12 오전 10.12.48.png`
- Mobile row reference: `/tmp/codex-remote-attachments/019fcba5-e320-7763-bfd4-651660a025ea/7EB7E657-F5D5-4DDE-BF97-1A239A2066C9/1-사진-1.jpg`
- Work-calendar reference: `/var/folders/8l/51nrjkvx1cvcwlxhcj_0w4g80000gn/T/TemporaryItems/NSIRD_screencaptureui_nr5JqS/스크린샷 2026-08-14 오전 11.34.12.png`
- Side-by-side evidence: `/tmp/family-scheduler-qa-comparison.png`
- Target viewports: desktop Chromium, mobile Chromium `402 × 874`
- Scope: 홈 오늘 일정, 통합 캘린더 상세, 가족 할 일, 일정 관리의 기념일·자녀 정보·학기/방학

## Implemented layout

- 근무·가족·자녀 상세 행은 공통 `ScheduleRow`를 사용한다.
- 첫 줄은 `아바타 · 일정명 · 장소`, 둘째 줄은 `시간 · 반복 규칙` 순서다.
- 둘째 줄은 첫 줄보다 정확히 `2px` 작고 `font-weight: 400`, `var(--muted)` 색상이다.
- 일정 행의 제목/메타 간격은 `6px`, 일반 행 좌우 내부 여백은 `9px / 7px`, 높이는 `68px`로 통일했다. 홈 시간 타임라인은 카드 모양을 없애기 위해 좌우 여백을 `0`으로 둔다.
- AI 템플릿처럼 보이던 구성원 색상 세로 강조선은 홈·캘린더·할 일·일정 관리에서 모두 제거했다.
- 가족 일정도 시간, 장소, 반복 규칙을 빠뜨리지 않고 표시한다.
- 가족 할 일도 제목/메타/기한·반복을 같은 2단 구조로 표시한다.
- 근무·가족·자녀 아바타의 왼쪽 시작점은 동일하다.
- 전체 캘린더의 D/E/N 텍스트는 근무 캘린더와 같은 주간·오후·야간 아이콘으로 교체했다.
- OFF는 전체 캘린더에서 아이콘을 표시하지 않으며 근무 탭과 날짜 접근성 설명에는 그대로 유지한다.
- 데스크톱 월 제목은 중앙을 유지하고 `오늘` 버튼은 모드 탭과 겹치지 않는다.
- 선택 날짜 제목의 인위적인 왼쪽 패딩을 제거했다.
- 홈의 `오늘 한눈에 보기`, `이번 주 한눈에 보기` 보조 문구를 제거했다.
- 홈의 `오늘의 일정`과 `이번 주 일정` 제목 시작선은 데스크톱·모바일에서 동일하다. 모바일 `390px` 실측은 모두 왼쪽 `37px`이다.
- 전체 캘린더는 구성원별 점과 `가n`, `자n` 문자를 쓰지 않고, 홈 요약과 동일한 집·자녀 SVG 아이콘과 숫자를 표시하며 충돌이 있을 때만 빨간 점을 추가한다.
- 전체 캘린더 아래 구성원 범례는 제거했다.
- 전체 캘린더의 자녀 세부 카드에서는 반복 요일을 숨기고, 일정 관리 화면에서는 그대로 표시한다.
- 학교·학원 및 자녀 전용 일정은 전체 캘린더에서도 항상 `자녀` 카테고리로 표시한다.
- 모바일 가족 캘린더 범례는 선택 날짜 상세에서 분리해 월 달력 바로 아래에 표시한다.
- 가족 할 일 기간 필터에서 `오늘`을 제거하고 남은 네 항목을 `11px` 이상 한 줄로 표시한다.
- 가족 구성원 수정 시 저장된 색상을 정규화해 정확한 선택 표시와 사용 중 안내를 유지한다.
- 근무표 안내 문장은 모바일에서 잘리지 않는 한 줄로 표시한다.
- 모바일 이번 주 일정은 진입 시 오늘 버튼이 항상 보이도록 자동으로 가로 위치를 맞춘다.
- 오늘 일정은 시간순 세로 타임라인으로 표시하고, 지난 일정은 흐리게, 진행 중 일정은 상태와 현재 시각선으로 구분한다.
- 이번 주 근무 요약은 최신 날짜별 입력을 사용하고 D/E/N/OFF를 근무 유형 아이콘·색상 알약으로 표시한다.
- 근무표 선택 카드는 흰 바탕을 유지하고 아이콘·근무명 영역에만 유형 색상을 적용한다.
- 근무 월 달력의 유형 배경도 아이콘과 D/E/N/OFF까지만 감싸고 셀 끝까지 늘어나지 않는다.
- 예전 저장 데이터에 아이콘 필드가 없어도 D/E/N/OFF 또는 근무 유형 ID로 해·일몰·달·달력 아이콘을 복원한다.
- 모바일 근무 달력은 근무 아이콘을 숨기지 않으며, 긴 사용자 정의 근무명은 카드 안에서 말줄임되어 문서 폭을 늘리지 않는다.
- 전체 달력의 가족·자녀 개수가 두 자리여도 자동으로 다음 줄을 사용해 셀 안에서 잘리지 않는다.
- 가족 할 일은 기본적으로 시간이 없으며 필요할 때 시작 또는 시작·종료 시간을 선택해 저장할 수 있다.
- 홈 오늘 일정의 시간은 아바타보다 왼쪽의 고정 열에 표시하며, 종일 일정은 빈 시간 열로 정렬만 유지한다.
- 홈 오늘 일정과 이번 주 일정의 근무 아이콘은 D 해, E 일몰, N 달, OFF 달력으로 정확히 구분한다.
- 이번 주 일정의 근무 요약은 근무 달력과 같은 D/E/N/OFF 유형색 배경과 아이콘을 사용한다.
- 이번 주 근무 배경은 `아이콘 + 근무명`의 실제 콘텐츠 너비까지만 채워지고 긴 근무명도 잘리지 않는다.
- 근무 요약 알약의 아이콘 좌우 여백은 같은 값으로 유지한다.
- 모바일 캘린더는 전체·가족·근무·자녀 보기 모두 같은 상단 구조를 사용하며, 월 제목은 네 탭 전체 폭의 중심에 맞춘다.
- 오늘 일정의 시간 지정 항목은 카드 테두리와 배경을 제거하고 `시간 → 타임라인 점 → 아바타 → 일정 정보` 순서의 열린 타임라인으로 표시한다.
- 현재 시각선과 각 일정의 타임라인 점은 같은 중심축에 맞고, 종료된 일정은 배경 카드 없이 전체 행만 흐려진다.
- 모바일 근무 달력의 OFF 칩은 텍스트와 아이콘을 모두 유지하면서 셀 내부에 완전히 수용된다.
- 마감일을 생략한 할 일은 생성일 당일의 `오늘의 일정`과 이번 주 요약에 표시된다.
- 현재 시각 라벨은 `지금`을 중복 표기하지 않고 시간만 표시하며, 타임라인 축을 왼쪽으로 옮겨 일정 정보 폭을 넓혔다.
- OFF처럼 시간이 없는 근무는 `시간 미정` 목록에서 숨기고 오늘 요약에서만 표시한다.

## Click-to-manage behavior

- 기념일, 자녀 정보, 학기·방학 기간 카드의 인라인 수정·삭제 아이콘을 제거했다.
- 자녀 캘린더의 학기·방학 반복 일정도 인라인 수정·삭제 아이콘을 제거했다.
- 각 행 전체가 키보드와 포인터로 활성화되며, 클릭하면 공통 하단 작업 시트가 열린다.
- 자녀 반복 일정은 행 클릭 후 이 날짜만 수정, 전체 반복 수정, 이 날짜만 취소, 전체 반복 삭제 범위를 선택한다.
- 작업 시트에서 수정·삭제를 선택하고 기존 삭제 확인 흐름을 재사용한다.
- 닫을 때 원래 선택한 행으로 포커스를 복귀시킨다.

## Automated verification

- ESLint: passed
- Production build: passed
- Desktop Chromium + Mobile Chromium: `66 passed`, `6 conditionally skipped`
- Combined end-to-end result: `66 passed`, `6 conditionally skipped`
- Layout assertions: title/secondary text `2px` difference, secondary weight `400`, common avatar start, row height `68px`, 일반 행 left/right padding `9px / 7px`, 홈 타임라인 padding `0`, title/meta gap `6px`, family time/location/recurrence visibility, desktop month/Today alignment, selected-date offset `0`, home heading starts equal, 오늘 일정 시간 열이 아바타보다 왼쪽, 타임라인 점과 현재 시각선 중심 일치, 네 캘린더 모드 월 제목 중심선 동일, 모바일 OFF 칩 셀 내부 수용
- Action assertions: anniversary, child profile, semester/vacation rows expose no inline actions and open edit/delete action sheets
- Calendar assertions: D/E/N uses a shift icon with no code text, OFF stays hidden only in the combined view, 집·자녀 SVG 아이콘과 숫자가 문자 카운트를 대체하고, combined-view legend is absent, combined-view child details omit weekday recurrence, recurring child rows expose no inline actions and open the recurring action dialog
- Home and task assertions: 세로 타임라인·현재 시각선·진행 상태, 생성일 기준 시간 없는 할 일 노출, OFF 근무 본문 중복 제거, 최신 근무 입력 선택, D/E/N/OFF별 해·일몰·달·달력 아이콘, 근무 배경 콘텐츠 폭 적용, 할 일 시작·종료 시간 저장과 목록 표시
- In-app Browser: local desktop and iPhone 16 Pro `402 × 874`; 이번 주 E 근무 배경이 아이콘·근무명까지만 감싸며 글자 잘림과 가로 넘침 없음
- Data migration/storage keys: unchanged

## Review note

참조 화면과의 비교는 제공된 스크린샷, DOM 구조, 데스크톱·모바일 레이아웃 수치 및 상호작용 회귀 테스트를 기준으로 수행했다. 현재 작업 범위에서 P0/P1/P2 잔여 항목은 없다.

final result: passed
