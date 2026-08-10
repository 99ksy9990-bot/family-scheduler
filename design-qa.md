# Design QA

## Comparison targets

- Source visual truth: `C:\Users\99ksy\.codex\codex-remote-attachments\019fd144-df0c-7670-a5d2-0447c45631d2\F34C1210-F5AC-4A96-B28A-E6234160DB66\1-사진-1.jpg`
- Local source copy used for normalization: `C:\Users\99ksy\Documents\패밀리 스케줄러\qa-shift-settings-reference.jpg`
- Implementation screenshot: `C:\Users\99ksy\Documents\패밀리 스케줄러\qa-shift-settings-mobile-fixed.png`
- Side-by-side comparison: `C:\Users\99ksy\Documents\패밀리 스케줄러\qa-shift-settings-comparison.png`

## Viewport and state

- Browser: Codex in-app browser, local Vite app at `http://127.0.0.1:5173/`.
- CSS viewport: 390 x 844.
- Source pixels: 588 x 1280, normalized to 390 x 849.
- Implementation pixels: 375 x 811, normalized to 390 x 843 for comparison.
- Density normalization: both images were scaled to 390 px width before comparison.
- State: family settings open and scrolled to the shift settings section.

## Findings

- No actionable P0, P1, or P2 findings remain.
- Fonts and typography: the existing Korean type scale and weights are preserved. Time labels remain centered and readable at mobile width.
- Spacing and layout rhythm: every shift row now uses two equal 139.7 px tracks with a 6 px gap. Measured child controls stay within the 316.6 px section boundary and no control has horizontal scroll overflow.
- Colors and visual tokens: the existing border, surface, teal action, and muted copy tokens remain unchanged.
- Image quality and assets: no image or icon assets were added or replaced.
- Copy and content: codes, shift names, and stored 24-hour values are preserved. Visible time labels use Korean `오전/오후` notation. The OFF row no longer renders meaningless empty time controls.

## Interaction checks

- Closed and reopened the family settings panel successfully.
- Verified six time selectors render for D, E, and N, and zero time selectors render for OFF.
- Verified each selector keeps its stored value and exposes an accessible shift-specific label.
- Verified no shift-setting control has `scrollWidth` larger than its rendered width.
- Lint and production build pass.

## Comparison history

- Before: iPhone Safari native time inputs retained an intrinsic width larger than each mobile grid track, causing the start and end controls to overlap and extend beyond the card.
- Fix: replaced native time inputs with bounded single-select controls backed by the same `HH:mm` data, added explicit mobile grid classes, and removed the OFF time row.
- After: the focused side-by-side comparison shows aligned two-column rows with visible gaps and no overlap or clipping.

## Follow-up polish

- None required for this scope.

final result: passed
