# 森林棋盤地板簡化

- 來源：`assets/tiles/ForestFloorPainted.png`，保留原版。
- 新版：`assets/tiles/ForestFloorPainted-v2.png`，內建 imagegen 編輯。
- 僅更新 `src/battleBoard.css` 的底圖引用；方格線、提示圖層、點擊判定、角色與戰鬥背景不變。
- 減少中央細碎裂紋與斑點對比，保留低對比石材變化，以及邊緣藤蔓、苔蘚和殘石。
- 已在實際 Tauri 開發視窗查看一般戰鬥、紅色危險格與橫掃預覽，操作檢查通過。這是素材替換，未重跑規則測試。

## 提示詞

Use case: precise-object-edit. Image 1 is the edit target: top-down square forest ruins battle floor texture. Simplify this exact game background so characters and colored targeting overlays read clearly. Keep the original overall subdued sage-gray stone and olive palette and similar midtone brightness; keep the leafy ivy/vines and scattered ruined masonry concentrated around the edges and corners, maintaining their recognizable placement. Retain a few subtle broad stone seams near the perimeter. Replace the dense tiny mottling, lichen speckles and fractured crack network across the playable central 75% with broad calm softly shaded stone surfaces. Remove about 85% of high-frequency detail in the center; broad low-contrast irregular tonal patches only, NOT blurry smearing, NOT perfectly uniform plastic. Hand-painted stylized fantasy game art, clean simplified shapes, no grain, no noisy grit. Vines may trail a little inward from the edges, but keep most of central area clear. Top-down orthographic, edge-to-edge square opaque floor texture. IMPORTANT no painted grid lines, no checkerboard, no rectangular tile layout, no border frame: an exact 5x5 grid is already rendered separately by the game. Do not add characters, objects, icons, glowing elements, text or labels. Avoid dramatic shadows or bright spots. Preserve forest ruin atmosphere and edge foliage, only reduce surface clutter.
