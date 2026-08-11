# Family Scheduler 모바일 통합 캘린더·주간 요약 QA

- Source visual truth: `/var/folders/8l/51nrjkvx1cvcwlxhcj_0w4g80000gn/T/TemporaryItems/NSIRD_screencaptureui_pgIIBB/스크린샷 2026-08-11 오후 2.17.47.png`
- Calendar implementation screenshot: `/Users/santak/Downloads/stitch_/output/playwright/mobile-overview-calendar-work-first.png`
- Home implementation screenshot: `/Users/santak/Downloads/stitch_/output/playwright/mobile-home-week-summary-divider-below-date.png`
- Viewport: in-app browser `402 × 874` CSS px, device scale factor 1
- Source pixels: `1706 × 1242` px (desktop reference)
- Implementation pixels: each `402 × 874` px
- State: 2026년 8월 전체 캘린더와 모바일 홈 이번 주 일정
- Normalization: desktop source is used for chip vocabulary, color, and typography; the mobile result intentionally compresses the same information into seven narrow columns rather than matching desktop geometry.

## Full-view comparison evidence

The integrated calendar keeps the desktop reference's `가 n`, `자 n`, and `D/E/N/OFF` colored chips on mobile, with the work chip placed first. The selected-day detail also places the work section before family and child schedules. The home weekly strip shows only weekday, date, a horizontal divider, `가족 n`, and `자녀 n`; holiday, conflict, total-count, and empty-state detail lines are hidden on mobile.

## Focused-region comparison evidence

A separate crop was not required because both requested regions are readable at native `402 × 874` capture size. The calendar capture clearly shows the `D` chip before `가 2` in the August 5 cell and the work section first in the selected-day panel. The home capture clearly shows the divider immediately below each date and the stacked family/child counts beneath it.

## Required fidelity surfaces

- Fonts and typography: mobile calendar chips and weekly counts explicitly use the existing A2Z family, matching the work detail copy family. Text remains legible without reverting to abstract dots.
- Spacing and layout rhythm: compact calendar chips wrap within the date cell; the weekly summary places a horizontal separator directly below the date, followed by a consistent two-row count block with no extra detail line.
- Colors and visual tokens: family lavender, child sky, and work shift chip colors are inherited unchanged from the desktop calendar.
- Image quality and asset fidelity: no new raster assets or replacement artwork are required; existing application icons and logo remain unchanged.
- Copy and content: calendar abbreviations remain `가`, `자`, and shift code; home copy is limited to `가족 n` and `자녀 n` as requested.

## Comparison history

1. Earlier finding `[P2]`: mobile integrated calendar converted desktop chips into circular dots, removing type and count information.
2. Fix: restored compact A2Z text chips with desktop semantic colors at the mobile breakpoint.
3. Earlier finding `[P2]`: the first weekly-summary pass placed family and child counts on one horizontal line.
4. Fix after user clarification: stacked `가족 n` and `자녀 n`, removed the remaining detail line, then moved the horizontal divider directly below the date.
5. Fix: moved the work chip and work detail section ahead of family and child content in the integrated calendar.
6. Post-fix evidence: mobile browser captures show no horizontal page overflow or console errors, and targeted Chromium tests confirm work-first ordering, chip text, A2Z font, stacked rows, the `1px` date divider, and hidden detail copy.

## Findings

No remaining actionable P0, P1, or P2 differences for the requested mobile calendar and weekly-summary scope.

## Follow-up polish

No P3 follow-up is required for this scope.

final result: passed
