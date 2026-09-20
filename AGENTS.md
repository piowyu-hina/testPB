# testPB

- This is the active Tauri + TypeScript + Vite desktop prototype. Do not use Unity or change the Unity project.
- The user authorized installing prerequisites and migrating to a standalone Tauri window. Build and test the desktop executable for this task.
- The installed game must run offline with embedded assets, without a Node server or console window. Source development uses Vite; double-clicking source index.html is no longer supported.
- Scope: a character portrait home screen with enlargement, one 5x5 tactical room, four movement cards, two enemy types, preview and replay. Returning home preserves the current room in memory; a finished room starts fresh.
- Mouse/touch game controls only; do not introduce keyboard shortcuts without being asked.
- Keep UI minimal. Reuse the approved PNG art; when new art is requested, use built-in imagegen with broad silhouettes and few details.
- Card data and rules must stay separate from rendering. Preview must match the committed result.
- Verify with npm test, npm run typecheck, browser pointer checks and a real Tauri/WebView2 window.
- Save local Git checkpoints. Do not publish remotely or create ZIP packages unless requested.
