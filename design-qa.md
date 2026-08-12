# Family Scheduler 통합 달력·모바일 입력 QA

- Source visual truth: `/tmp/codex-remote-attachments/019fcba5-e320-7763-bfd4-651660a025ea/4982EEF6-65D1-4DEE-8701-C849C2E7656C/1-사진-1.jpg`
- Latest action-sheet reference: `/tmp/codex-remote-attachments/019fcba5-e320-7763-bfd4-651660a025ea/F9D8E420-1B50-45EB-B73F-50649EE32AE4/1-사진-1.jpg`
- Implementation screenshot: `/Users/santak/Downloads/stitch_/output/playwright/qa-calendar-all-mobile-2026-08-12.png`
- Latest mobile verification: `/Users/santak/Downloads/stitch_/output/qa-current/calendar-action-sheet-402x874.png`
- Combined comparison: `/Users/santak/Downloads/stitch_/output/playwright/qa-calendar-comparison-2026-08-12.png`
- Viewport: `402 × 874` CSS px, iPhone 16 Pro 대응 폭
- State: 2026년 8월 12일, 전체 캘린더, 가족·자녀 일정과 엄마 근무가 함께 등록된 상태

## Full-view comparison evidence

참조 화면과 구현 화면을 같은 모바일 폭으로 정규화해 한 이미지에서 비교했다. 구현 화면은 월간 달력을 `508px` 높이로 확장했고, `70px` 셀 6행을 사용해 선택한 날짜의 `8월 12일 수요일` 헤더가 하단 내비게이션 위에서 시작되도록 맞췄다. 문서와 달력 카드의 가로 넘침은 모두 0이다.

## Focused-region comparison evidence

- 전체 달력: `OFF`는 숨기고 D/E는 작은 중립 글자, N은 어두운 알약으로 표시한다. 근무 탭과 날짜 상세에는 OFF 데이터가 유지된다.
- 일정 표시: 구성원별 색 점을 최대 4개 표시하고 나머지는 `+n`으로 축약한다. 분류색 대신 실제 담당자 색을 사용한다.
- 위험 표시: 시간이 겹치는 날은 일정 점 옆의 작은 빨간 점으로만 알리고, 선택한 날짜 상세에서 겹치는 일정명을 안내한다. 일정 3개 이상 테두리는 제거했다.
- 격자와 날짜: 세로 격자선은 제거하고 주 단위 가로선만 유지한다. 오늘은 네이비 숫자 원, 일요일·공휴일인 오늘은 흰 숫자와 빨간 링으로 구분한다.
- 접근성: 날짜 버튼 설명에 근무 코드, 가족·자녀 일정 수와 시간 겹침 상태를 포함한다.
- 모바일 입력: 폼 모달은 헤더·스크롤 본문·고정 푸터 구조이고, 버튼은 콘텐츠 위에 겹치지 않는다. 높이는 `100vh` 호환 선언 뒤 `100dvh`로 덮는다.
- 안전 여백: 페이지·플로팅 버튼·토스트가 공통 `--nav-safe`를 사용한다.
- 빈 상태와 연결: 홈에 로컬 저장 상태와 가족 연결 CTA를 제공하고, 자녀 미등록 화면은 자녀 추가부터 일정 등록까지 한 흐름으로 안내한다.
- 알림 권한: 차단 상태에서도 설정 방법을 열 수 있고, 지원하지 않는 환경만 비활성화한다.
- 할 일: 기간 필터를 4개로 정리하고 알림·반복 설정을 필요할 때 펼치는 구조로 바꿨다.

## Automated verification

- ESLint: passed
- Production build: passed
- Playwright: 43 passed, 3 conditionally skipped
- Mobile calendar metrics: viewport `402×874`, card height `508`, grid height `427`, cell height `70`, selected-date panel top `717`, marker font `10px`
- Modal metrics: modal overflow `hidden`, scroll body overflow `auto`, footer position `static`, viewport fit passed

## Findings and fixes

1. 긴 일정명은 액션 영역을 밀지 않도록 제목 행을 숨김 처리하고 제목만 말줄임한다.
2. 전체 모드의 OFF는 시각적으로만 숨기며 접근성 설명과 근무 탭에는 그대로 남긴다.
3. 이전·다음 달 비활성 셀에는 일정·근무 마커를 표시하지 않는다.
4. 모달 닫기 후 명시적으로 전달한 트리거 버튼으로 포커스를 복귀시킨다.
5. 기존 등록 데이터 스키마와 저장 키는 변경하지 않았다.
6. 일정과 할 일의 수정·삭제는 인라인 아이콘 대신 행 전체 탭으로 여는 공통 하단 작업 시트에서 제공한다.
7. 삭제 확인은 기존 앱 확인 다이얼로그를 재사용하며, 작업 시트를 Escape로 닫으면 원래 행으로 포커스가 복귀한다.
8. 하단 작업 시트를 `document.body` 포털로 올려 모바일 내비게이션과 겹치지 않게 했고, 확인 다이얼로그가 항상 작업 시트 위에 표시되도록 레이어 순서를 고정했다.
9. 전체 달력의 시간 겹침은 담당자가 달라도 같은 시간대의 가족 활동이면 감지해 월간 탐색과 상세 드릴다운에서 함께 알린다.
10. 근무 상세도 자녀·가족 일정과 동일한 공용 한 줄 행을 사용하며, 일정명은 근무 코드만 표시한다.
11. 반복 자녀 일정의 이름과 인라인 수정·삭제 버튼을 제거하고 아바타·일정·시간·카테고리만 표시한다. 행을 누르면 공용 작업 시트가 열린다.
12. 모바일 작업 시트는 하단 내비게이션 위에서 끝나며 `402×874`에서 삭제 버튼 하단 `770px`, 내비게이션 상단 `808.5px`로 겹침이 없다.
13. 동기화 상태 배너를 고정 오버레이로 바꾸고 페이지 진입 `translateY` 애니메이션을 제거해 저장 상태 변화와 화면 전환 때 본문이 아래로 밀렸다 돌아오지 않는다.

## Remaining issues

요청 범위에서 남은 P0, P1, P2 항목은 없다.

final result: passed
