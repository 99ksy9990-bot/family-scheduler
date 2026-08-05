# Family Scheduler UX audit — 2026-08-05

## Scope

- Home, calendar, family tasks, schedule management, family connection, and focus mode
- Desktop 1280×900 and mobile 393×852
- Combined UX and visible accessibility review

## Overall verdict

The core navigation and visual system are consistent, and the key flows are understandable. The next improvements should prioritize data safety and clarity over further cosmetic changes.

## Priority recommendations

1. **Make family data safety explicit.** The family connection dialog shows both “stored on this device” and cross-device wording. Show the exact state: local-only, syncing, last synced, or sync failed. Add automatic recovery plus export/import.
2. **Align task totals with the active period filter.** “1 task remaining” is visible while the default “this month” view shows zero in every category. The headline should use the filtered count, or clearly separate “all 1 / this month 0”.
3. **Use a mobile date agenda sheet.** The month grid is readable, but holiday text is truncated and selected-date details sit below the fold. Open a bottom sheet or compact agenda when a date is tapped.
4. **Increase mobile action targets.** Anniversary edit/delete controls are 32×32 px; 14 visible buttons are under 44 px in at least one dimension. Keep the icon size but enlarge the tappable area to at least 44×44 px.
5. **Simplify anniversary entry.** The mobile form is dense and the birth-year selector contains 127 options. Reveal birth year only for birthdays and use a searchable year field or native date picker.
6. **Collapse repeated empty states.** When all task categories are empty, show one clear empty state and keep category add actions compact.
7. **Explain focus mode before first use.** The feature works and is reversible, but the header control is icon-only. Add a short first-use label or tooltip such as “오늘 일정만 보기”.
8. **Clarify notification state.** Replace “알림 켜기” with a status-aware control showing what will be reminded, current permission state, and how to recover from blocked permission.

## Confirmed strengths

- Four primary destinations remain consistent across desktop and mobile.
- Active navigation, calendar tabs, and management tabs are clear.
- Calendar dates include semantic day/holiday labels.
- Icon-only edit/delete actions have accessible names.
- Focus mode works and provides an obvious exit action after activation.
- No browser console warnings or errors were observed during the audit.

## Evidence limits

- No create, edit, delete, login, account creation, or notification permission was submitted, to avoid changing saved family data or external state.
- Screen-reader announcements, keyboard-only completion, browser zoom, and real iOS notification delivery still require separate testing.

## Screenshots

- `01-home-desktop.png`
- `02-calendar-desktop.png`
- `03-tasks-desktop.png`
- `04-management-desktop.png`
- `05-home-mobile.png`
- `06-calendar-mobile.png`
- `07-tasks-mobile.png`
- `08-management-mobile.png`
- `09-management-mobile-lower.png`
- `10-family-connect-mobile.png`
- `11-focus-mode-mobile.png`
