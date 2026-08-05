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
- Task-card source truth: `/var/folders/8l/51nrjkvx1cvcwlxhcj_0w4g80000gn/T/TemporaryItems/NSIRD_screencaptureui_s4qank/스크린샷 2026-08-05 오후 2.16.28.png` (886 × 382), family-input source truth: `/tmp/codex-remote-attachments/019fcba5-e320-7763-bfd4-651660a025ea/85D7F271-0BB1-4C2E-AFA7-0ECEC869483D/1-사진-1.jpg` (588 × 1280), and filter-overflow source truth: `/var/folders/8l/51nrjkvx1cvcwlxhcj_0w4g80000gn/T/TemporaryItems/NSIRD_screencaptureui_FBeXf3/스크린샷 2026-08-05 오후 2.25.08.png` (362 × 74).
- Revised captures: `/tmp/family-scheduler-task-card-filter-final.png` and `/tmp/family-scheduler-family-input-final.png` (both 387 × 841 at the 402 × 874 CSS viewport). Focused comparisons: `/tmp/family-scheduler-task-card-focused-compare.png`, `/tmp/family-scheduler-family-input-compare.png`, and `/tmp/family-scheduler-filter-compare.png`.
- Current period source: `/var/folders/8l/51nrjkvx1cvcwlxhcj_0w4g80000gn/T/TemporaryItems/NSIRD_screencaptureui_V7z7p4/스크린샷 2026-08-05 오후 2.37.49.png` (1498 × 882). Current preview-removal source: `/var/folders/8l/51nrjkvx1cvcwlxhcj_0w4g80000gn/T/TemporaryItems/NSIRD_screencaptureui_YEJrgP/스크린샷 2026-08-05 오후 2.36.23.png` (306 × 142).
- Current browser-rendered captures: `/tmp/family-scheduler-period-form-final.png` (1265 × 804), `/tmp/family-scheduler-anniversary-form-final.png` (1265 × 1075), and `/tmp/family-scheduler-event-range-modal-final.png` (1265 × 712), captured in the 1280 × 720 CSS browser viewport at device scale factor 2. Current combined comparison: `/tmp/family-scheduler-comparison-final.jpg` (1500 × 1180), with both source and implementation contained in equal-width panels.
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
- Task-card flow: add `황도 픽업`, assign it to 아빠, verify metadata/actions/avatar placement, open edit, and delete the temporary task afterward.
- Family-connect input: type into the email field and verify its computed 16 px font size and all panel controls remain within the 402 px viewport.
- Period filter: verify `전체·오늘·이번 주·이번 달·기한 없음` fit without horizontal scrolling at 402 × 874 and that person filters are absent.
- Multi-day event: register `QA 연속 휴가` for 2026-08-10 through 2026-08-12, confirm the same event appears on all three calendar dates, open it from August 11, confirm both saved boundary dates, and delete it once to remove all three occurrences.
- Child-specific periods: register a vacation period for 초롱 and a term period for 연두 over the same dates, then register one matching Wednesday schedule per child. The August 5 calendar cell displayed both `QA 초롱 방학` and `QA 연두 학기`, proving the period lookup is child-specific. All QA records were deleted afterward.
- Period form: verify `자녀 · 구분 · 시작일 · 종료일 · 기간 추가` share one desktop row and the document has no horizontal overflow.
- Anniversary form: verify the `다음 기념일` preview is absent and the add action remains aligned with the other form controls.
- Calendar holidays: verify Saturday blue, Sunday red, public-holiday red, holiday names, and substitute-holiday details in both 일반 and 근무표 modes.

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
| P2 | Task metadata displayed the internal `새로 추가됨` status, while assignee and edit/delete controls competed for the right edge. | Suppressed the internal status, moved edit/delete beside the task title, and placed the assignee avatar in the far-right action slot. | Passed |
| P2 | Family-connect inputs used sub-16 px mobile text, triggering iPhone Safari focus zoom and making the panel look wider than the screen. | Set all mobile modal input/select/textarea controls to 16 px while preserving their existing control geometry. | Passed |
| P2 | The six assignee filters used horizontal scrolling and clipped `연두` on mobile. | Replaced the mobile scroller with a six-column compact grid that fits at 402 px and the 320 px stress width. | Passed |
| P2 | Assignee choices were not in the requested family-first order. | Reordered all assignee pickers and filters to 가족·아빠·엄마·초롱·연두, while keeping pickup choices limited to 아빠 and 엄마. | Passed |
| P1 | A vacation or term period applied globally, so 초롱 and 연두 could not use different school calendars. | Added a child selector to each period and resolved the active season independently for each child; legacy periods remain available as `전체 자녀`. | Passed |
| P2 | The period editor was constrained to a centered narrow card and split across rows. | Expanded the section to the full content width and placed child, type, both dates, and the add action in one desktop row; mobile keeps a no-overflow stacked layout. | Passed |
| P1 | Period date values could remain at the old defaults when the browser emitted an input event without a change event. | Bound both input and change events, read controlled values, added required/min constraints, and verified 2026-08-20 and 2026-08-31 persisted exactly. | Passed |
| P1 | A family vacation required separate daily events. | Added start/end dates with same-day defaults and range-aware calendar lookup; one saved event now renders on every inclusive date and deletes as one record. | Passed |
| P2 | The yellow `다음 기념일` preview consumed form space after the user no longer wanted it. | Removed the preview component and its layout tracks/styles; the anniversary add action now follows the date fields directly. | Passed |
| P2 | The task page used member filters even though long-running lists need time-based narrowing. | Replaced member filters with `전체·오늘·이번 주·이번 달·기한 없음`; the five-button mobile grid has no horizontal overflow. | Passed |
| P2 | Calendar dates did not distinguish weekends or identify public and substitute holidays. | Added semantic Saturday/Sunday colors plus Korean public-holiday, lunar-holiday, election-day, and substitute-holiday labels and detail cards. | Passed |

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
- Focused task-card comparison: the saved status line is gone; `2026-08-05` is the only detail text, edit/delete share the title line, and the 아빠 avatar occupies the far-right slot. The card and document report no horizontal overflow.
- Family-input comparison: the email field computes to 16 px, spans x=22–365 inside the x=0–387 panel, and remains unchanged after typing; the tabs also remain inside the same panel bounds.
- Filter comparison: at 402 px all six filters end exactly at the 373 px content edge; at 320 px each is approximately 42.8 px wide and the last filter ends at 290.99 px inside the 291 px content edge. Horizontal overflow is false at both widths.
- Period-row comparison: all five controls share y=589 px in the 1280 px viewport; the row spans x=100–1166 px and document overflow is false. The source and final layout were inspected together in `/tmp/family-scheduler-comparison-final.jpg`.
- Date-range modal: start and end default to the same selected day. In the browser capture each field has a 246 px border box and equal 244 px client/scroll width; the mobile rule stacks the two bounded date inputs below 660 px to prevent native iOS date text clipping.
- Range behavior: `QA 연속 휴가` appeared on August 10, 11, and 12; editing from August 11 restored boundaries `2026-08-10` and `2026-08-12`; one confirmed delete removed all three calendar labels.
- Child-specific behavior: overlapping child periods preserved different seasons on the same day; the August 5 cell simultaneously rendered 초롱's vacation schedule and 연두's term schedule.
- Anniversary-preview comparison: the source preview is visible in the left panel while the final form contains no `.anniversary-preview` element; the add button remains aligned at the end of the form row.
- Shift-summary verification: the August footer rendered `1/31일 입력 · D 1 · E 0 · N 0 · OFF 0` from the persisted data with no horizontal overflow at 402 px.
- Focused mobile measurements: calendar date numerals 14 px (previously 16 px); anniversary preview and action share the same top coordinate; milestone and missing-year labels compute as separate block lines.
- Home anniversary measurements: title and edit/delete controls share one row; the detail computes as a single 15.5 px-high line at the 402 px viewport. Verified copy includes `매년 양력 8월 5일 · 다음 기념일에 26주년`.
- Console: zero errors and zero warnings during the verified flows.
- Build checks: ESLint passed, Vite production build passed, manifest JSON parsed successfully.

## Latest period-filter and holiday verification

- Source visual truth: `/var/folders/8l/51nrjkvx1cvcwlxhcj_0w4g80000gn/T/TemporaryItems/NSIRD_screencaptureui_iV5Rsd/스크린샷 2026-08-05 오후 2.41.25.png` at 2334 × 1308 px (2× density).
- Browser-rendered implementation: `/Users/santak/Downloads/stitch_/qa-tasks-period-filter-exact.png` at 1167 × 654 px, matching the source's normalized CSS viewport at device scale factor 1.
- Full-view comparison: `/Users/santak/Downloads/stitch_/qa-tasks-comparison-exact.png`.
- Focused filter comparison: `/Users/santak/Downloads/stitch_/qa-tasks-filter-focus-exact.png`; the current app intentionally retains its existing fixed header and has an empty task data state, while the compared title/action/filter/category geometry and visual tokens are preserved.
- Mobile calendar evidence: `/Users/santak/Downloads/stitch_/qa-calendar-mobile.png`, captured at the 402 × 874 CSS viewport. The calendar measured 357 px client/scroll width with no horizontal overflow.
- Primary interactions tested: all five task period buttons; member-filter absence; 일반/근무표 tabs; August 15 public holiday; August 17 substitute holiday; September 24–26 Chuseok span; selected-day holiday details; empty-day helper copy.
- Holiday evidence: August 8 computed blue (`rgb(55, 111, 195)`); August 16 computed red (`rgb(212, 81, 75)`); August 15 and 17 rendered `광복절` and `광복절 (대체공휴일)` in red. The substitute-holiday detail card exposes no edit/delete actions.
- Responsive evidence: at 402 × 874 the five period-filter buttons measured 359 px client/scroll width, and `쉬거나 새 일정을 추가하세요.` rendered as one 159 px line with `white-space: nowrap`.
- Required fidelity surfaces: A2Z/KIMM typography and hierarchy were preserved; spacing/radii/shadows remain on the existing tokens; only semantic weekend/holiday colors were added; Lucide assets remain unchanged; copy now reflects period filtering and concise empty guidance.
- Comparison history: the initial member-filter state was replaced with the requested period filter; post-fix browser captures found no remaining P0/P1/P2 layout or interaction findings.
- Browser console: zero errors and zero warnings.
- React quality review: static filter data and holiday caches are module-scoped; state is derived during render; no new effects or global listeners were added.

## Latest action alignment and responsive-form verification

- Source visual truth: `/var/folders/8l/51nrjkvx1cvcwlxhcj_0w4g80000gn/T/TemporaryItems/NSIRD_screencaptureui_oEmjAI/스크린샷 2026-08-05 오후 3.10.35.png` (770 × 928), `/tmp/codex-remote-attachments/019fcba5-e320-7763-bfd4-651660a025ea/CBEF8831-5F44-4AA6-A223-B03BD775E25B/1-사진-1.jpg`, `/var/folders/8l/51nrjkvx1cvcwlxhcj_0w4g80000gn/T/TemporaryItems/NSIRD_screencaptureui_K13ZZ6/스크린샷 2026-08-05 오후 3.21.00.png` (2246 × 296), and `/var/folders/8l/51nrjkvx1cvcwlxhcj_0w4g80000gn/T/TemporaryItems/NSIRD_screencaptureui_gIt2if/스크린샷 2026-08-05 오후 3.22.48.png` (2246 × 296).
- Browser-rendered implementation: `qa-task-actions-mobile.png` (402 × 874), `qa-period-mobile.png` (393 × 852), `qa-child-form-mobile.png` (393 × 852), and `qa-child-form-desktop.png` (1280 × 720), all captured from the local Vite app.
- Full and focused comparison evidence: `qa-latest-comparison.png` (1580 × 780). The relevant source and implementation regions are contained in equal-width panels; unrelated page chrome and crop differences are excluded from alignment judgments.
- Viewports and density: 1280 × 720 CSS px desktop and 402 × 874 / 393 × 852 CSS px mobile at device scale factor 1. The 770 × 928 task source is a focused crop, while the two 2246 × 296 sources are high-density desktop crops; implementation regions were proportionally contained rather than stretched.
- State: editable task card assigned to 아빠; empty 학기 child-schedule list; mobile 학기·방학 form; desktop 학기 child-schedule form.
- Primary interactions tested: open task edit, cancel it, switch between 학기·방학 and 자녀 일정, inspect all controls at 402 px and 393 px, and verify desktop/mobile responsive placement.
- Browser console: zero errors and zero warnings.

### Latest comparison history

| Severity | Earlier finding | Fix | Post-fix evidence |
| --- | --- | --- | --- |
| P2 | Task edit/delete icons sat above the assignee avatar's visual center. | Moved edit/delete and avatar into one right-aligned flex action cluster. | Both 28 px buttons and the 38 px avatar report the same 859.6 px center line at 402 px. |
| P1 | Focused sub-16 px schedule controls could trigger iPhone Safari zoom, leaving a white strip and horizontally shifted page. | Set all mobile inputs/selects/textareas to 16 px and clipped root-level accidental horizontal overflow. | At 402 px and 393 px, visual viewport scale is 1 and root/body scroll width equals viewport width. |
| P2 | Mobile period dates were centered and all four controls stacked vertically. | Left-aligned native date values and changed the mobile form to two equal columns. | `자녀·구분` and `시작일·종료일` each share one row; both dates are 16 px and `text-align: left`. |
| P2 | The period description extended beyond the right edge while being kept to one line. | Added hidden overflow with an ellipsis to the existing single-line rule. | The 330 px line has `overflow: hidden`, `text-overflow: ellipsis`, and no document overflow. |
| P2 | The child-schedule add action occupied a separate oversized row. | Expanded the desktop form to six tracks and assigned location, pickup, and actions two tracks each. | Location, pickup, and the 164.6 px action button share the same 801.9–864.9 px row; mobile intentionally retains a safe full-width action row. |
| P2 | `위 입력란에서 학교나 학원 일정을 추가하세요.` wrapped into two lines. | Removed the generic empty-copy width cap for this list and kept the sentence on one line. | The sentence measures 250 px at the 393 px viewport with equal client/scroll width and no horizontal overflow. |

### Required fidelity surfaces

- Fonts and typography: A2Z/KIMM roles and weights are unchanged; mobile form controls now use the iOS-safe 16 px size without changing headings or empty-state hierarchy.
- Spacing and layout rhythm: action buttons align with the assignee avatar; period controls use balanced two-column rows; the desktop schedule action follows location and pickup on the same baseline.
- Colors and visual tokens: existing sage, teal, surface, border, radius, shadow, and semantic action colors are unchanged.
- Image and icon fidelity: existing Lucide pencil, trash, family, calendar, and graduation-cap assets are preserved with no substitute artwork.
- Copy and content: requested empty-state and explanatory copy remain unchanged; only wrapping/truncation behavior was corrected.
- Responsive result: 402 px and 393 px document/body scroll widths exactly equal their viewports. No persistent control is clipped.

## Latest schedule-action simplification verification

- Source visual truth: `/var/folders/8l/51nrjkvx1cvcwlxhcj_0w4g80000gn/T/TemporaryItems/NSIRD_screencaptureui_J7GmX9/스크린샷 2026-08-05 오후 3.31.22.png`.
- Browser-rendered implementation: `qa-schedule-action-right.png` (1265 × 712 at the 1280 × 720 CSS viewport, device scale factor 1).
- Focused side-by-side comparison: `qa-schedule-action-comparison.png` (1580 × 320). Both rows were proportionally contained in equal-width panels; the source intentionally shows the fields requested for removal.
- State: editable 학기 child-schedule form with default start/end times and no saved schedule.
- Interaction checks: switched to 자녀 일정, confirmed the revised fields, verified the add action geometry, and confirmed the task page initially selects `이번 달`.
- Responsive check: at 393 × 852 CSS px the start/end controls and action stack safely; document scroll width equals the 393 px viewport.
- Browser console: zero errors and zero warnings.

### Comparison history

| Severity | Earlier finding | Fix | Post-fix evidence |
| --- | --- | --- | --- |
| P2 | 장소 and 픽업 담당 occupied a separate row even though they were no longer needed. | Removed both fields from create/edit state and suppressed legacy location/pickup metadata in generated child events and saved-schedule cards. | The form contains zero location and pickup controls. |
| P2 | The add action sat below the time controls. | Changed the desktop form to eight tracks: start time 3, end time 3, action 2. | Both time fieldsets and the action wrapper share the exact 727.4–790.4 px row; the button sits immediately to the right of 종료 시간. |
| P2 | 가족 할 일 initially opened with the broad 전체 filter. | Changed the initial filter state to `이번 달`. | `이번 달` reports `aria-pressed=true` and the active class immediately after navigation. |

### Required fidelity surfaces

- Typography: existing A2Z/KIMM roles, label hierarchy, and 43 px control typography are unchanged.
- Spacing/layout: the desktop row now reads 시작 시간 → 종료 시간 → 추가 with balanced 3:3:2 tracks and no horizontal overflow.
- Colors/tokens: existing teal primary action, borders, radii, surfaces, and shadows are preserved.
- Image/icon fidelity: the existing Lucide plus icon and all select chevrons remain unchanged.
- Copy/content: only the explicitly removed 장소 and 픽업 담당 fields/metadata were deleted; the schedule title and time copy remain intact.

## Latest mobile event and calendar verification

- Source visual truth: `/tmp/codex-remote-attachments/019fcba5-e320-7763-bfd4-651660a025ea/68589172-D8F3-4BAD-9F33-87715FF377C3/1-사진-1.jpg` (588 × 1280 iPhone Safari capture).
- Browser-rendered implementation: `qa-event-modal-mobile.png`, `qa-calendar-mobile-dots.png`, and `qa-calendar-selected-mobile.png`, captured at the 393 × 852 CSS viewport.
- Side-by-side comparison: `qa-event-modal-comparison.png`; source and implementation are proportionally contained in equal-width panels without stretching.
- Mobile event date fields: start/end controls are bounded to the modal width and use a measured 14 px vertical gap; document scroll width equals the 378 px client width.
- New-event defaults: 아빠 is the active assignee and the location input is empty. Existing saved event values remain unchanged when editing.
- Mobile calendar density: event labels and holiday names both have zero visible instances; four event/holiday dots remain visible in the August data set.
- Selected-date behavior: clicking August 5 keeps the cell selected and renders the two saved anniversary entries in the detail panel immediately below the calendar.
- Browser console: zero errors and zero warnings during modal open/close, calendar navigation, date selection, and detail-panel verification.

### Latest comparison history

| Severity | Earlier finding | Fix | Post-fix evidence |
| --- | --- | --- | --- |
| P2 | 시작일자 and 종료일자 were collapsed together by a mobile `gap: 0` override. | Assigned a dedicated 14 px mobile gap while retaining the bounded native date controls. | Both date fields remain inside the modal with a measured 14 px separation and no horizontal overflow. |
| P2 | New schedules defaulted to 엄마 and prefilled `우리 집`. | Changed new-item defaults to 아빠 and an empty location; edit state still reads the saved item first. | The new modal reports the 아빠 button as active and the location value as an empty string. |
| P2 | Holiday/event text competed with calendar dates on the mobile grid. | Hid all calendar-cell text below 660 px while preserving semantic dots and selected-day details. | Zero visible holiday/event labels, visible dots, and the full selected-day detail panel below the grid. |

final result: passed
