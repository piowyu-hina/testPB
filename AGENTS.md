# testPB

- This is the active Tauri + TypeScript + Vite desktop prototype. Do not use Unity or change the Unity project.
- The user authorized installing prerequisites and migrating to a standalone Tauri window. Build and test the desktop executable for this task.
- The installed game must run offline with embedded assets, without a Node server or console window. Source development uses Vite; double-clicking source index.html is no longer supported.
- Scope: a character portrait home screen (display only; no zoom), a three-room 5x5 journey, four movement cards, two enemy types and an elite imp variant. Room transitions carry health and heal 1 (maximum 5). Returning home preserves the room or pending clearance in memory; death or final victory allows a fresh journey.
- Mouse/touch game controls only; do not introduce keyboard shortcuts without being asked.
- Intermediate room clears open an exit on the top-center tile; no next-room modal/button. Show two reusable exploration cards, short and diagonal, independent of the combat deck. Movement requires their legal offsets but spends no actions or turns. Enter the exit to advance and heal. Preserve cleared-room state when visiting home. Disable browser context menus; right-click must not change selection.
- Only the redesigned long-haired heroine is playable (HeroineHead.png / HeroinePortrait.png). No male character, character picker, or saved character selection. Portrait remains display-only.
- Keep UI minimal. Reuse the approved PNG art; when new art is requested, use built-in imagegen with broad silhouettes and few details.
- Card data and rules must stay separate from rendering. Preview must match the committed result.
- Verify with npm test, npm run typecheck, browser pointer checks and a real Tauri/WebView2 window.
- Save local Git checkpoints. Do not publish remotely or create ZIP packages unless requested.
