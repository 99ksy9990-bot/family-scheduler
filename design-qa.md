# Design QA

## Comparison targets

- Source visual truth:
  - `C:\Users\99ksy\.codex\codex-remote-attachments\019fd144-df0c-7670-a5d2-0447c45631d2\ED066DC1-570C-49B5-8106-6325EBFC1411\1-사진-1.jpg`
  - `C:\Users\99ksy\.codex\codex-remote-attachments\019fd144-df0c-7670-a5d2-0447c45631d2\ED066DC1-570C-49B5-8106-6325EBFC1411\2-사진-2.jpg`
- Implementation screenshots:
  - `C:\Users\99ksy\.codex\visualizations\2026\08\05\019fd144-df0c-7670-a5d2-0447c45631d2\family-scheduler-shift-settings-mobile.png`
  - `C:\Users\99ksy\.codex\visualizations\2026\08\05\019fd144-df0c-7670-a5d2-0447c45631d2\family-scheduler-schedule-tabs-mobile.png`
- Side-by-side comparison evidence:
  - `C:\Users\99ksy\.codex\visualizations\2026\08\05\019fd144-df0c-7670-a5d2-0447c45631d2\family-scheduler-shift-settings-comparison.png`
  - `C:\Users\99ksy\.codex\visualizations\2026\08\05\019fd144-df0c-7670-a5d2-0447c45631d2\family-scheduler-schedule-tabs-comparison.png`

## Viewport and state

- Browser: Codex in-app browser, local Vite app at `http://127.0.0.1:5173/`.
- CSS viewport override: 390 x 844.
- Source pixel size: 588 x 1280 for each supplied screenshot.
- Implementation capture size: 375 x 811 at device scale factor 1.
- Density normalization: each source was downsampled to 375 px width before side-by-side comparison.
- States: family member settings scrolled to shift configuration; schedule management opened on its default category.

## Findings

- No actionable P0, P1, or P2 findings.
- Fonts and typography: existing Korean app font family, weights, hierarchy, and wrapping remain consistent with the source screens.
- Spacing and layout rhythm: each mobile shift row now uses two equal 139.7 px columns for code/name and start/end; measured input rectangles do not overlap. Document scroll width is 375 px within the 390 px viewport.
- Colors and visual tokens: existing primary teal, neutral borders, card surfaces, and selected states are unchanged.
- Image quality and assets: no image assets were added or replaced; existing Lucide and native time-control icons remain sharp.
- Copy and content: the shift separator is removed; schedule tabs read `자녀 일정`, `학기·방학`, `자녀 정보`, `기념일`; the timed-event reminder offers `30분 전`.

## Interaction checks

- Opened and closed family settings.
- Verified all four shift rows have four inputs, no separator text, no overlap, and no horizontal overflow.
- Verified the schedule tab order and that `자녀 일정` is active on first entry.
- Switched to `기념일`, left schedule management, returned, and verified `자녀 일정` is active again.
- Opened a new event, enabled time selection, and verified `앱 알림` contains `알림 없음` and `30분 전`.
- Browser console errors: none.

## Comparison history

- Initial post-fix comparison: no P0/P1/P2 differences remained. The requested differences from the source screenshots are intentional: the `~` separator is removed, time fields are aligned as a two-column row, the schedule categories are reordered, and `자녀 일정` is selected by default.

## Follow-up polish

- None required for this scope.

final result: passed
