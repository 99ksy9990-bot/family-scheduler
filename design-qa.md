# Design QA

## Comparison targets

- Source visual truth:
  - `C:\Users\99ksy\.codex\codex-remote-attachments\019fd144-df0c-7670-a5d2-0447c45631d2\8F30A439-D390-4263-ADE9-F34698866D10\1-사진-1.jpg`
  - `C:\Users\99ksy\.codex\codex-remote-attachments\019fd144-df0c-7670-a5d2-0447c45631d2\8F30A439-D390-4263-ADE9-F34698866D10\2-사진-2.jpg`
  - `C:\Users\99ksy\.codex\codex-remote-attachments\019fd144-df0c-7670-a5d2-0447c45631d2\8F30A439-D390-4263-ADE9-F34698866D10\3-사진-3.jpg`
  - `C:\Users\99ksy\.codex\codex-remote-attachments\019fd144-df0c-7670-a5d2-0447c45631d2\8F30A439-D390-4263-ADE9-F34698866D10\4-사진-4.jpg`
- Implementation screenshots:
  - `C:\Users\99ksy\.codex\visualizations\2026\08\05\019fd144-df0c-7670-a5d2-0447c45631d2\family-scheduler-home-deduplicated-mobile.png`
  - `C:\Users\99ksy\.codex\visualizations\2026\08\05\019fd144-df0c-7670-a5d2-0447c45631d2\family-scheduler-tasks-default-week-mobile.png`
  - `C:\Users\99ksy\.codex\visualizations\2026\08\05\019fd144-df0c-7670-a5d2-0447c45631d2\family-scheduler-anniversary-placeholder-mobile.png`
- Side-by-side comparison evidence:
  - `C:\Users\99ksy\.codex\visualizations\2026\08\05\019fd144-df0c-7670-a5d2-0447c45631d2\family-scheduler-home-comparison.png`
  - `C:\Users\99ksy\.codex\visualizations\2026\08\05\019fd144-df0c-7670-a5d2-0447c45631d2\family-scheduler-tasks-comparison.png`
  - `C:\Users\99ksy\.codex\visualizations\2026\08\05\019fd144-df0c-7670-a5d2-0447c45631d2\family-scheduler-anniversary-comparison.png`

## Viewport and state

- Browser: Codex in-app browser, local Vite app at `http://127.0.0.1:5173/`.
- Mobile CSS viewport override: 390 x 844.
- Wide regression viewport: 1280 x 900.
- Source pixel size: 588 x 1280 per supplied screenshot.
- Implementation capture size: 375 x 811 at device scale factor 1.
- Density normalization: each source was downsampled to 375 px width before side-by-side comparison.
- States: home with a child schedule, tasks on initial load, and anniversary form with an empty birth-year selection.

## Findings

- No actionable P0, P1, or P2 findings.
- Fonts and typography: the anniversary name placeholder and empty year selection both compute to 14 px, `rgb(143, 151, 156)`, and `-0.56px` letter spacing on mobile. A selected year returns to the existing 16 px dark ink style.
- Spacing and layout rhythm: mobile and 1280 px layouts have no horizontal overflow. Existing card, filter, and form spacing remain unchanged.
- Colors and visual tokens: placeholder gray and selected dark ink use the existing neutral palette; category colors and active teal filter state are preserved.
- Image quality and assets: no image assets or icons were added or replaced.
- Copy and content: child schedules are shown only in the child section; the remaining timeline uses `그 밖의 일정은 없습니다.` when appropriate. Task headings read `긴급`, `장보기`, `집안일`, and `이번 주` is selected by default.

## Interaction checks

- Verified a child schedule appears in `자녀 일정` and does not appear again in `오늘의 일정`.
- Switched the calendar to `자녀표`, returned home, selected `캘린더 보기`, and verified `일반` is active.
- Verified the initial task period filter is `이번 주`.
- Verified task category order is `긴급`, `장보기`, `집안일` at mobile and wide widths.
- Verified task sort code places dated past items after current/future items, with newer past dates before older past dates.
- Verified empty year and selected year visual states.
- Browser console errors: none.

## Comparison history

- Initial post-fix comparison: no P0/P1/P2 differences remained. Data differences between the supplied captures and local browser state are expected; the requested information architecture, ordering, placeholder styling, and responsive behavior were compared directly.
- Focused comparison: the anniversary form comparison provides a readable focused view of the name placeholder, year placeholder, and selected field styling; no additional crop was needed.

## Follow-up polish

- None required for this scope.

final result: passed
