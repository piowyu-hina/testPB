# In-game language

Supported locales: `zh-Hant` (Traditional Chinese) and `en` (English).
Village and battle settings share **繁體中文 / English** controls. No flags, keyboard shortcuts, extra HUD text, or scrollbars.

- First run: the primary system/browser language beginning with `zh` selects Traditional Chinese; all others select English.
- Explicit choice is stored under `testpb.language`. Storage failures fall back safely to the system preference, and switching still works for the session.
- Switching updates existing text and accessible labels. It does not rebuild Screens, reset the journey, change the deck, or clear the selected card.
- Localization is embedded in the app and needs no network service. This does not add save-game persistence or publish an itch.io release.

## Implementation

`src/i18n/catalog.ts` contains complete English sentences keyed by the authored Chinese text, shared names, and explicit patterns for dynamic labels. `translate.ts` is DOM-free and unit-testable. Game rules and dungeon data remain language-independent; their authored descriptions stay in Chinese.

`src/i18n/index.ts` binds the existing imperative renderers to the catalog. A single MutationObserver translates newly rendered text, `aria-label`, `title`, `alt`, and `placeholder` before paint. Original text is retained in WeakMaps for exact round-trips. IDs, datasets, game objects, art, and event handlers are untouched. Locale changes synchronously walk existing bindings. Script/style/noscript and `data-i18n-skip` (the native language buttons) are excluded.

When adding content:

1. Add the full sentence to the catalog; do not stitch translated words into English grammar. Dynamic labels need an explicit pattern and a test.
2. Render authored/source text, not translated DOM text read back from another element. Synchronous composition before insertion is fine.
3. Use `cloneLocalized` instead of `cloneNode(true)` for text-bearing presentation copies. It preserves the original language for later switching.
4. `missingTranslations()` reports unresolved Chinese in English mode. Extend browser coverage for new flows. Do not suppress missing text to make an audit pass.
5. Verify both languages at the normal game size. Shorten wording or adjust the layout if necessary; do not shrink fonts or introduce scrolling.

Glossary: 魂火 = **Soulfire**, 槍刺 = **Spear Thrust**, 橫掃 = **Sweep**, 槍柄推擊 = **Shaft Bash**, 破曉一槍 = **Dawnbreak**, 絕影 = **Absolute Shadow**. Names: Qinghe, Luxue, Lianmiao.

## Verification

- `npm test`: rules plus locale detection, catalog coverage and dynamic grammar.
- `npm run test:language`: pointer-operated bilingual settings, persisted preference, battle selection preservation, menus/shop/deck/rewards, both characters, enemy/ultimate help, clone round-trips, missing-translation audit and no-scrollbar checks.
- `npm run typecheck` and `npm run build` (web assets only; no native release packaging).
- Existing Chinese-specific browser tests explicitly request `zh-TW`; English tests request `en-US`.
- With the existing native window's CDP endpoint in `TESTPB_CDP`, `node tests/native-localization.cjs` clicks both languages, captures screenshots and restores the original language without reloading or opening another window.

For Vite test imports, reuse the loaded module URL (including its HMR timestamp) when inspecting localization state. Importing a second timestamp-free copy creates a separate test instance, not the active app's bindings.
