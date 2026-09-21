# testPB

- This is the active Tauri + TypeScript + Vite desktop prototype. Do not use Unity or change the Unity project.
- The user authorized installing prerequisites and migrating to a standalone Tauri window. Build and test the desktop executable for this task.
- The installed game must run offline with embedded assets, without a Node server or console window. Source development uses Vite; double-clicking source index.html is no longer supported.
- Scope: a village hub with a display-only character portrait, an unavailable guild entrance, settings, and a dungeon selection Screen for Forest Ruins. Forest Ruins uses the three-room 5x5 journey, four movement cards, Thorn Sprouts and Stump Guards (including an elite guard). Room transitions carry health and heal 1 (maximum 5). Returning to the village preserves the room or pending clearance in memory; death or final victory allows a fresh journey.
- Forest monster skills and art are documented in docs/ForestMonsters.md. Skill/facing stay fixed during player actions; all forecast attacks resolve before enemies move and change intent. Front blocks consume the card/action without damage or movement. UI forecasts must use the same EnemyRules as combat resolution.
- Screen navigation and session ownership are documented in docs/ScreenArchitecture.md. Keep each Screen's template and interactions local; wire navigation in main.ts. New village/forest art and generation prompts are documented in docs/VillageArt.md.
- Mouse/touch game controls only; do not introduce keyboard shortcuts without being asked.
- Intermediate room clears open an exit on the top-center tile; no next-room modal/button. Show two reusable exploration cards, short and diagonal, independent of the combat deck. Movement requires their legal offsets but spends no actions or turns. Enter the exit to advance and heal. Preserve cleared-room state when visiting home. Disable browser context menus; right-click must not change selection.
- Only the redesigned long-haired heroine is playable (HeroineHead.png / HeroinePortrait.png). No male character, character picker, or saved character selection. Portrait remains display-only.
- Keep UI minimal. Reuse the approved PNG art; when new art is requested, use built-in imagegen with broad silhouettes and few details.
- Judge character art by its proportions, readability, and intended game style, not color matching the current background (the user will replace it). Current home portrait uses the user-provided white-haired catgirl, from art-previews/catgirl-6x.png. The board has a matching winking catgirl head with simplified accessories. See docs/CatgirlPortraitTrial.md and docs/CatgirlHead.md.
- Card data and rules must stay separate from rendering. Preview must match the committed result.
- Board hero currently uses the user-provided full chibi sprite from art-previews/ChatGPT Image 2026年9月20日 下午11_15_17.png, copied to assets/characters/heroine/HeroineHead.png. Earlier generated heads are historical only.
- For code/gameplay changes, verify with npm test, typecheck, browser pointer checks and a real Tauri window. For image-only replacements, skip test suites: inspect the image, build and open the desktop app.
- Save local Git checkpoints. Do not publish remotely or create ZIP packages unless requested.
