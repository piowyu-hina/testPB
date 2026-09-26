# 青禾立繪簡化試作

- 原版保留：`assets/characters/qinghe/Portrait-v7.png`。
- 本次版本：`assets/characters/qinghe/Portrait-v8-simple.png`，由共用角色美術設定引用於村莊、選角與大招演出。
- 使用內建 imagegen 編輯原圖，保留生成的透明通道；未改動露雪、戰鬥 token 或卡圖。
- 方向：保留臉、神情、比例、握槍姿勢與服裝輪廓，減少花紋與零碎陰影。服裝簡化較明顯，頭髮仍保留較多細節；屬待使用者比較的試作，並非已驗收定稿。
- 已在實際 Tauri 開發視窗檢查村莊及雙角色選擇畫面，確認透明背景、全身構圖與縮小後的辨識效果。

## 生成提示

### 後續局部像素整理（v9）

目前引用 `Portrait-v9-flat-clothing.png`。使用者明確要求程式統一同色區域，且頭髮先不處理。由 `scripts/flatten-qinghe-clothing.py` 從 v8 產生，僅整理披風底色與白衣亮面，限制 RGB 各通道變動不超過 4；保留原始 alpha、陰影及輪廓，不改頭髮。初次全區調色盤量化造成陰影斑駁，已棄用，改為兩個明確底色的局部吸附。v8 保留，可隨時比較。這不是將全身所有平面完全重塗。

### v8 原始生成提示

Use case: identity-preserve. Image 1 is the edit target: Qinghe game character portrait. Create a carefully simplified version of THIS exact portrait for a game, genuinely transparent background with clean alpha, no background haze or glow. Preserve her exact face identity, cheerful open-mouth expression, eye shape and amber color, head/body proportions, full-body pose, both hands gripping the same diagonal double-ended spear, costume silhouette and green/ivory/brown palette. Preserve complete boots and spear tips with modest clear margins. Make a meaningful reduction of ornamental and rendering complexity, NOT blur: remove about 75% of repeated gold botanical motifs on cloak, leaving just a few broad simple leaf accents near two hem areas; remove the intricate green embroidery on white sleeves and tunic hem, replacing with simple clean trim. Keep flower hair clip and round cloak brooch. Consolidate hair into broad flowing locks with very few interior lines and one coherent soft highlight rather than fragmented streaks. Simplify fabric folds to large readable shadow shapes, remove tiny wrinkles, texture speckles, shiny micro-highlights and etched details on accessories. Keep dimensional anime cel shading with restrained soft transitions, not a flat vector icon. Maintain attractive clean anime linework and original face rather than redesigning her. Simplify spear ornamentation while retaining its distinctive double-ended silhouette. Visual hierarchy: face first, gesture second, costume shape third; calm uncluttered surfaces elsewhere. No new accessories, no extra limbs/fingers, no text, no watermark. Output one high-resolution vertical transparent PNG portrait.
