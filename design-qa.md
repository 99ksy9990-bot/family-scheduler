# Calendar mode header design QA

- Source visual truth:
  - `C:\Users\99ksy\.codex\codex-remote-attachments\019fd144-df0c-7670-a5d2-0447c45631d2\E88EA125-CFA2-42FA-B2E9-7D5480824A4F\1-사진-1.jpg` — mobile header structure
  - `C:\Users\99ksy\.codex\codex-remote-attachments\019fd144-df0c-7670-a5d2-0447c45631d2\E88EA125-CFA2-42FA-B2E9-7D5480824A4F\2-사진-2.jpg` — lavender segmented background
- Normalized source: `design-qa-source-mobile-normalized.png`
- Implementation screenshot: `design-qa-calendar-mobile.png`
- Implementation URL: `http://127.0.0.1:5173/`
- State: 2026년 8월, 가족 캘린더 selected
- Viewport: 439 × 793 CSS px; captured raster 425 × 768 px; device scale factor 1
- Source pixels: 588 × 1280 px for each attachment
- Normalization: removed source device status area, cropped the app-owned region, and resized it to the 425 × 768 implementation capture.

## Full-view comparison evidence

- The month navigation is centered above the segmented control in both source and implementation.
- The three controls have equal widths and now read `가족`, `근무`, `자녀`.
- The implementation retains the requested lavender background (`rgb(231, 230, 251)`) while the selected control uses the existing teal primary color.
- The calendar begins directly beneath the header with the same compact mobile rhythm. Browser-only scrollbar chrome is excluded from design findings.

## Focused region comparison evidence

- A separate crop was not required because the normalized full-view images render the month title and all three tab labels clearly.
- DOM measurements confirm the mobile toolbar is 396.6 px wide and 100.3 px high; the segmented control spans the same width and is 46.3 px high.

## Required fidelity surfaces

- Fonts and typography: existing A2Z display type and Korean UI weights are preserved; labels remain legible without wrapping or truncation.
- Spacing and layout rhythm: month row and segmented row share one full-width column with a 12 px gap; all three modes measure identically.
- Colors and visual tokens: the existing `--lavender` and primary teal tokens are reused as requested.
- Image quality and asset fidelity: no new raster assets or placeholder graphics were introduced; existing icon components remain sharp.
- Copy and content: `일반·근무표·자녀표` is replaced with the requested `가족·근무·자녀`.

## Interaction checks

- `가족`, `근무`, and `자녀` each select and render their corresponding content.
- After selecting `자녀`, leaving the calendar, and clicking `캘린더` again, the selected mode resets to `가족`.
- Browser console error check: no errors.

## Comparison history

- Initial P2: only the child mode used the compact transparent mobile header; the other modes retained an enclosing white card.
- Fix: generalized the child-mode mobile toolbar rules to all three modes and retained the lavender segmented background.
- Post-fix evidence: all three modes report the same 396.6 × 100.3 px toolbar geometry and the same lavender background; normalized visual comparison shows the requested hierarchy.

## Findings

- No actionable P0, P1, or P2 differences remain for the requested header and mode-selection scope.

## Follow-up polish

- None required for this scope.

final result: passed
