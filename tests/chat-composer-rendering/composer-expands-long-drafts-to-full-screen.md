### Composer expands long drafts to full screen

#### Feature/Change Name
Thread composer 25-line inline editor toggle and full-screen expand control for multi-line drafts.

#### Prerequisites/Setup
1. Dev server running (`pnpm run dev --host 127.0.0.1 --port 4173`)
2. Any existing thread is open and send controls are enabled
3. Light theme and dark theme both available from the appearance switcher

#### Steps
1. In light theme, confirm the top-right `Expand editor to 25 lines` button is visible with an empty draft. Click it and confirm the textarea grows to approximately 25 lines, capped by available viewport height.
2. Type a draft, collapse the editor, and expand again. Confirm text and attachments remain intact and focus returns to the textarea.
3. Repeat in a new chat and an existing thread at desktop, 375x812, and 768x1024 viewports. Confirm send/model controls remain reachable with no horizontal overflow.
4. In light theme, type or paste at least six lines into the composer.
5. Confirm the full-screen expand button appears to the left of the height toggle in the composer input area.
6. Click the full-screen expand button.
7. Confirm the composer fills the viewport, keeps the draft text, and leaves model/skill/thinking/send controls usable at the bottom.
8. Click the full-screen collapse button.
9. Confirm the composer returns to its normal inline size with the draft still intact.
10. Switch to dark theme and repeat steps 1-9.

#### Expected Results
- All drafts show the inline height toggle; short drafts do not show the separate full-screen control.
- Long or overflowing drafts also show the full-screen control.
- Full-screen mode uses the same draft state and submit controls as inline mode.
- Full-screen and inline states are readable in light theme and dark theme.

#### Rollback/Cleanup
- Exit full-screen mode, collapse the inline editor, and clear the test draft.

---
