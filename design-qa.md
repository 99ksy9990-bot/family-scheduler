# Design QA — mobile layout corrections

## Source truth

- User references: six iPhone Safari captures at 588 × 1280 px in `/tmp/codex-remote-attachments/019fcba5-e320-7763-bfd4-651660a025ea/46E1388C-148F-4929-BC58-60F93C16B4A7/`.
- Additional source truth: in-browser annotations for the anniversary card actions and anniversary form row grouping.
- Current source truth: `/tmp/codex-remote-attachments/019fcba5-e320-7763-bfd4-651660a025ea/EC2A7CB7-0A3C-44AA-AC15-EF697AE11FE2/1-사진-1.jpg` (588 × 1280 px iPhone Safari capture).
- Latest mobile source truth: `/tmp/codex-remote-attachments/019fcba5-e320-7763-bfd4-651660a025ea/982D602A-AC99-43BB-9182-E4A0309C3307/1-사진-1.jpg`, `/tmp/codex-remote-attachments/019fcba5-e320-7763-bfd4-651660a025ea/982D602A-AC99-43BB-9182-E4A0309C3307/2-사진-2.jpg`, `/tmp/codex-remote-attachments/019fcba5-e320-7763-bfd4-651660a025ea/982D602A-AC99-43BB-9182-E4A0309C3307/3-사진-3.jpg`, and `/tmp/codex-remote-attachments/019fcba5-e320-7763-bfd4-651660a025ea/B3820701-A919-4120-9975-88CA15A12BF1/1-사진-1.jpg`.
- Implementation: local Vite app at `http://127.0.0.1:4173/`.
- Current implementation capture: `/tmp/family-scheduler-qa-mobile-due-date.png` (387 × 841 px browser-rendered capture at the 402 × 874 CSS viewport).
- Current normalized comparison: `/tmp/family-scheduler-due-date-comparison.png`; the 588 × 1280 source was proportionally resized to 386 × 841 and placed beside the 387 × 841 implementation capture. Browser/device chrome differences were excluded from the focused alignment judgment.
- Latest normalized comparisons: `/tmp/family-scheduler-calendar-compare.png`, `/tmp/family-scheduler-task-compare.png`, and `/tmp/family-scheduler-event-compare.png`. Each source/implementation pair was normalized to the same 700 px height and visually inspected side by side.
- Primary QA viewport: 402 × 874 CSS px (iPhone 16 Pro/17 responsive target).
- Stress viewport: 320 × 844 CSS px.

## States and interactions tested

- Home: hero greeting and supporting copy.
- Tasks: open the add-task modal, inspect the deadline field and sticky action row, then cancel the modal.
- Schedule management / anniversaries: inspect the input form, saved anniversary rows, full milestone text, and edit/delete placement.
- Schedule management / periods: inspect the term/vacation form and stacked date fields.
- Browser console: errors and warnings.
- Task modal: enter `2026-08-05`, visually compare the deadline field with the supplied iPhone reference, and verify left/vertical alignment without saving.
- Task modal persistence: type a title, choose `2026-08-07`, return focus to the title, and confirm the date remains visible, aligned, and inside the modal.
- Event modal persistence: enter a date different from the selected calendar day, submit, confirm it appears only on the entered date, then delete it and verify it remains deleted after the 650 ms family-sync save window.
- Event defaults: confirm a new event starts as `종일`, time controls appear only after `시간 지정`, and the one-row member picker offers 엄마·아빠·초롱·연두·가족.
- PWA icon: verify Apple touch and manifest PNG assets, 64 px legibility, and non-white full-bleed corner pixels.

## Comparison history

| Severity | Source mismatch | Correction | Result |
| --- | --- | --- | --- |
| P1 | Deadline input extended outside the task modal on mobile. | Constrained form controls and date inputs to the modal width. | Passed |
| P1 | Cancel and add-task actions were clipped below the visible modal. | Added a scroll-safe modal backdrop and a sticky, safe-area-aware action row. | Passed |
| P2 | The mobile deadline value was centered while the title and category values were left aligned. | Left-aligned the iOS date value while preserving vertical centering and the 48 px control height. | Passed |
| P1 | Term/vacation start and end dates overlapped. | Stacked date controls at mobile widths and constrained each input to 100%. | Passed |
| P2 | Anniversary details were truncated with an ellipsis. | Removed mobile ellipsis and allowed the full milestone detail to wrap. | Passed |
| P2 | Anniversary edit/delete actions reduced the detail width and sat between title and metadata. | Moved both actions into the anniversary title row; metadata now uses the full content width below. | Passed |
| P2 | Anniversary name/type and year/month/day consumed unnecessary vertical space. | Grouped name/type on one row and year/month/day on one row at mobile widths. | Passed |
| P2 | Mobile calendar date numerals felt oversized in the annotated 320 px reference. | Reduced only date numerals from 16 px to 14 px; weekday and event type remain unchanged. | Passed |
| P2 | The next-anniversary preview and add action occupied two separate rows. | Reduced the preview and aligned it with the add action on one row. | Passed |
| P2 | Birthday/anniversary milestone and missing-year copy wrapped at arbitrary words. | Put both the milestone phrase and `연도 미입력` on a deliberate second line below the solar-date line. | Passed |
| P2 | Home anniversary edit/delete actions shared the metadata line, and the date/milestone copy still wrapped. | Moved actions to the title line and rendered the full date/milestone copy on one uninterrupted line below. | Passed |
| P2 | The home greeting always said morning. | Made the greeting switch automatically between morning, afternoon, and evening, refreshing once per minute. | Passed |
| P2 | The `오늘 요약` card looked actionable but did not navigate. | Converted it to an accessible button that smoothly moves to `오늘의 일정`. | Passed |
| P1 | A selected calendar-event date could appear to disappear in mobile Safari because the native date control appearance was disabled. | Restored the native date appearance and set explicit text color, fill color, opacity, and width bounds. | Passed |
| P2 | The task deadline value sat against the top of its 48 px mobile input instead of being vertically centered like the other controls. | Kept native date rendering and assigned the input/value area a 46 px line box with zero vertical padding and centered value height. | Passed |
| P2 | The shift-entry footer only reported the selected day status, so the monthly D/E/N/OFF balance was not visible. | Replaced it with the entered-day total plus live D, E, N, and OFF counts for the displayed month. | Passed |
| P2 | Home greeting and explanatory copy wrapped unnecessarily. | Shortened supporting copy and used responsive single-line mobile typography. | Passed |
| P2 | Regular Safari browsing retained the bottom address bar. | Added a standalone web-app manifest and Apple web-app metadata. Safari chrome is removed when launched from the Home Screen; a normal web page cannot hide browser chrome. | Passed with platform constraint |
| P2 | 320 px stress testing exposed the old fixed body minimum width. | Removed the fixed body minimum width and verified no horizontal overflow. | Passed |
| P1 | iOS date controls in task and event modals extended beyond the right edge after typing. | Removed native-control inline padding from layout sizing, retained a 7 px text indent, and constrained physical/inline widths to the modal. | Passed |
| P2 | Event date text did not share the title input's left text start. | Tuned the native date indent so both values begin 14 px inside their common field edge. | Passed |
| P1 | A date chosen in the event modal could be visually changed but saved under the previously selected calendar day. | Read named date controls from `FormData` at submit time and update controlled state on both input and change events. | Passed |
| P1 | A locally deleted event could be restored by an older family-sync realtime payload while a save was pending. | Track pending local saves and ignore stale remote snapshots until the current local snapshot is acknowledged. | Passed |
| P2 | Empty-calendar guidance wrapped `추가하세요.` onto a second line. | Kept the concise helper sentence on one mobile line. | Passed |
| P2 | Every new event started with arbitrary start/end times and the four-person member picker stacked into two rows. | Made `종일` the default with optional time expansion; placed five choices in one row and added a distinct family assignee. | Passed |
| P2 | The iOS Home Screen shortcut relied on the SVG favicon and could show a white canvas. | Added full-bleed 180/192/512 PNG assets and linked them through Apple touch metadata and the web manifest. | Passed |

## Surface audit

- Typography: existing A2Z/KIMM family rules preserved; mobile hero size reduced responsively without changing hierarchy.
- Spacing and geometry: controls remain inside their cards and modals at 402 px and 320 px widths; no horizontal overflow was found.
- Color and assets: existing palette, icon library, avatars, borders, and shadows preserved.
- Home Screen icon: generated with built-in ImageGen as a full-bleed deep-teal family rhythm mark with coral, sage, sky, and lime forms; all four corner samples are teal rather than white and the mark remains recognizable at 64 px.
- Copy: mobile helper and empty-state messages are concise and constrained to one line where requested.
- Interaction: task modal opens and cancels; navigation and schedule-management tabs remain interactive.
- Added interaction checks: the deadline computes `text-align: left` with a 48 px height, and activating `오늘 요약` changes scroll position toward the `today-schedule` target.
- Calendar-event date verification: after selecting `2026-08-06` and moving focus to another field, the value remained visible with native appearance and no horizontal overflow at 402 px.
- Focused deadline comparison: the supplied reference and revised implementation were normalized side by side; `2026-08-05` is left aligned and visually centered inside the 48 px control. Computed input line-height is 46 px with zero vertical padding; no horizontal overflow was found.
- Final mobile date measurements: title and date fields share the same left/right bounds; title padding is 14 px and the native date control uses a 7 px indent that visually resolves to the same text start. Task date right edge 351 px < modal right edge 373 px; event date right edge 336 px < modal right edge 358 px.
- Calendar empty-state measurement: one 19.5 px-high line with `white-space: nowrap`; document horizontal overflow is false.
- Event data flow: `2026-08-07` test event was absent from August 5, present on August 7, then absent immediately and after a 950 ms sync delay following delete; undo status remained available.
- All-day/family flow: `가족 여행` saved as `종일` with the family avatar and remained deleted after the sync delay.
- Member-picker stress check: at 320 × 844 all five buttons measured 42.6 px wide in one row inside the 233 px picker; modal/document horizontal overflow remained false. At 402 × 874 the task deadline and five-member row both remained inside the modal.
- Shift-summary verification: the August footer rendered `1/31일 입력 · D 1 · E 0 · N 0 · OFF 0` from the persisted data with no horizontal overflow at 402 px.
- Focused mobile measurements: calendar date numerals 14 px (previously 16 px); anniversary preview and action share the same top coordinate; milestone and missing-year labels compute as separate block lines.
- Home anniversary measurements: title and edit/delete controls share one row; the detail computes as a single 15.5 px-high line at the 402 px viewport. Verified copy includes `매년 양력 8월 5일 · 다음 기념일에 26주년`.
- Console: zero errors and zero warnings during the verified flows.
- Build checks: ESLint passed, Vite production build passed, manifest JSON parsed successfully.

final result: passed
