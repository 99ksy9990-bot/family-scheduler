# 자녀 주간 생활표 QA

- Source visual truth: `C:\Users\99ksy\.codex\generated_images\019fd144-df0c-7670-a5d2-0447c45631d2\exec-4e5b19c5-c89a-4274-884f-d5f17868f264.png`
- Implementation screenshot: `C:\Users\99ksy\Documents\패밀리 스케줄러\qa-child-week-mobile.png`
- Comparison image: `C:\Users\99ksy\Documents\패밀리 스케줄러\qa-child-week-comparison.png`
- Browser viewport: 390 x 844 CSS px
- State: 캘린더 > 자녀표 > 초롱 > 2026년 8월 10일

## Full-view comparison evidence

참조 화면과 구현 화면을 같은 390 x 844 기준으로 나란히 비교했다. 상단 자녀표 탭, 자녀 선택, 학교 정보, 월~금 주간 선택, 선택 날짜 타임라인, 하단 내비게이션의 계층과 색상 흐름이 일치한다. 기존 Family Scheduler 글꼴·색상·아이콘을 그대로 사용했으며 가로 넘침은 없다.

## Focused behavior evidence

- 월~금 영역 왼쪽과 오른쪽 화살표로 7일씩 이동한다.
- 2026년 8월 17일 `광복절 (대체공휴일)`에는 반복 등록된 `정규 수업`이 생성되지 않고 공휴일 안내가 표시된다.
- 다음 날인 8월 18일에는 학교 `정규 수업`과 학원 `영어 교실`이 시간순으로 표시된다.
- 프로필 편집 버튼이 `일정 관리 > 자녀 정보`로 연결되고 입력한 학교·학년·반·번호·담임·연락처를 유지한다.

## Findings

- P0/P1/P2 없음.
- Layout: 390px 모바일에서 탭, 프로필, 주간 이동, 타임라인이 겹치거나 잘리지 않는다.
- Visual fidelity: 참조의 청록 강조색, 흰 카드, 둥근 주간 선택 구조를 기존 디자인 토큰으로 재현했다.
- Interaction: 자녀 전환, 날짜 선택, 이전/다음 주, 프로필 편집이 모두 동작한다.
- Holiday logic: 공휴일에는 학교·학원 반복 일정만 제외되며 공휴일 표시는 유지된다.
- Browser console errors: 없음.

final result: passed
