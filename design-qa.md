# Design QA — mobile layout corrections

## Source truth

- User references: six iPhone Safari captures at 588 × 1280 px in `/tmp/codex-remote-attachments/019fcba5-e320-7763-bfd4-651660a025ea/46E1388C-148F-4929-BC58-60F93C16B4A7/`.
- Additional source truth: in-browser annotations for the anniversary card actions and anniversary form row grouping.
- Implementation: local Vite app at `http://127.0.0.1:4173/`.
- Primary QA viewport: 402 × 874 CSS px (iPhone 16 Pro/17 responsive target).
- Stress viewport: 320 × 844 CSS px.

## States and interactions tested

- Home: hero greeting and supporting copy.
- Tasks: open the add-task modal, inspect the deadline field and sticky action row, then cancel the modal.
- Schedule management / anniversaries: inspect the input form, saved anniversary rows, full milestone text, and edit/delete placement.
- Schedule management / periods: inspect the term/vacation form and stacked date fields.
- Browser console: errors and warnings.

## Comparison history

| Severity | Source mismatch | Correction | Result |
| --- | --- | --- | --- |
| P1 | Deadline input extended outside the task modal on mobile. | Constrained form controls and date inputs to the modal width. | Passed |
| P1 | Cancel and add-task actions were clipped below the visible modal. | Added a scroll-safe modal backdrop and a sticky, safe-area-aware action row. | Passed |
| P1 | Term/vacation start and end dates overlapped. | Stacked date controls at mobile widths and constrained each input to 100%. | Passed |
| P2 | Anniversary details were truncated with an ellipsis. | Removed mobile ellipsis and allowed the full milestone detail to wrap. | Passed |
| P2 | Anniversary edit/delete actions reduced the detail width and sat between title and metadata. | Moved both actions into the anniversary title row; metadata now uses the full content width below. | Passed |
| P2 | Anniversary name/type and year/month/day consumed unnecessary vertical space. | Grouped name/type on one row and year/month/day on one row at mobile widths. | Passed |
| P2 | Mobile calendar date numerals felt oversized in the annotated 320 px reference. | Reduced only date numerals from 16 px to 14 px; weekday and event type remain unchanged. | Passed |
| P2 | The next-anniversary preview and add action occupied two separate rows. | Reduced the preview and aligned it with the add action on one row. | Passed |
| P2 | Birthday/anniversary milestone and missing-year copy wrapped at arbitrary words. | Put both the milestone phrase and `연도 미입력` on a deliberate second line below the solar-date line. | Passed |
| P2 | Home anniversary edit/delete actions shared the metadata line, reducing its usable width. | Moved actions to the title line and gave the two-line date/milestone copy the full width below, retaining the middle-dot continuation cue. | Passed |
| P2 | The home greeting always said morning. | Made the greeting switch automatically between morning, afternoon, and evening, refreshing once per minute. | Passed |
| P2 | Home greeting and explanatory copy wrapped unnecessarily. | Shortened supporting copy and used responsive single-line mobile typography. | Passed |
| P2 | Regular Safari browsing retained the bottom address bar. | Added a standalone web-app manifest and Apple web-app metadata. Safari chrome is removed when launched from the Home Screen; a normal web page cannot hide browser chrome. | Passed with platform constraint |
| P2 | 320 px stress testing exposed the old fixed body minimum width. | Removed the fixed body minimum width and verified no horizontal overflow. | Passed |

## Surface audit

- Typography: existing A2Z/KIMM family rules preserved; mobile hero size reduced responsively without changing hierarchy.
- Spacing and geometry: controls remain inside their cards and modals at 402 px and 320 px widths; no horizontal overflow was found.
- Color and assets: existing palette, icon library, avatars, borders, and shadows preserved.
- Copy: mobile helper and empty-state messages are concise and constrained to one line where requested.
- Interaction: task modal opens and cancels; navigation and schedule-management tabs remain interactive.
- Focused mobile measurements: calendar date numerals 14 px (previously 16 px); anniversary preview and action share the same top coordinate; milestone and missing-year labels compute as separate block lines.
- Home anniversary measurements: title and edit/delete controls share one row; both detail lines extend to the event-copy right edge. Verified copy includes `매년 양력 8월 5일 ·` and `다음 기념일에 26주년`.
- Console: zero errors and zero warnings during the verified flows.
- Build checks: ESLint passed, Vite production build passed, manifest JSON parsed successfully.

final result: passed
