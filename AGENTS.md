# testPB

- This is the active lightweight browser prototype. Do not use Unity or change the Unity project for this work.
- Keep `index.html` directly usable over `file://`, with no package installation, network access, CDN, build step, or server required.
- Scope: one 5x5 tactical room, four movement cards, two enemy types, preview and replay.
- Mouse/touch game controls only; do not introduce keyboard shortcuts without being asked.
- Keep UI minimal. Reuse the approved PNG art; when new art is requested, use built-in imagegen with broad silhouettes and few details.
- Card data and rules must stay separate from rendering. Preview must match the committed result.
- Verify rules with `node --test tests/rules.test.cjs` and browser behavior with local screenshots and pointer interaction checks.
- Save local Git checkpoints. Do not publish or create an executable/ZIP unless requested.
