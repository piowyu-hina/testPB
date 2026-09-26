# 青禾卡圖可讀性整理

使用內建 imagegen 編輯既有卡圖，保留透明通道；原版 PNG 全數保留。沒有修改玩法、立繪或頭髮。

- `assets/cards/qinghe/Thrust-v2.png`：斜向大槍尖，直線動勢。
- `assets/cards/qinghe/Advance-v2.png`：前踏靴子，移除槍與環形旋風。
- `assets/cards/qinghe/Sweep-v2.png`：單一環形揮擊，去除碎葉與星芒。
- `assets/cards/qinghe/DawnSpear-v2.png`：金色直線貫穿，與橫掃圓環區隔。

共用 `src/data/cardArt.ts` 更新手牌、提示及換牌插圖。後續顯示整理：未充能大招底圖提高可見度；爆牌卡移除可見名稱並讓圖片占滿內容區，保留輔助閱讀文字，未改動畫速度。

## 提示詞

### Thrust

Use case: style-transfer. Edit target is the supplied card illustration. Redraw it as a SIMPLE readable hand-drawn fantasy game skill icon, not a finished card. Genuine transparent background. Square composition, subject fills central 85% with clear margins, clean dark brown outlines, broad flat colors and just one shadow tone, muted forest green, ivory steel and warm brass/brown. Readable at 100px. No texture noise, no tiny engravings, no scattered leaves, no particles, no glow or haze, no text, no frame. Keep fantasy equipment identity but simplify aggressively. Show a single strong spear THRUST: oversized broad spearhead on a short visible shaft pointing diagonally from lower left toward upper right, large triangular silhouette, two short straight motion strokes behind it. No circular effects. Spearhead occupies about half the icon; not a thin horizontal stick.

### Advance

Use case: style-transfer. Edit target is the supplied card illustration. Redraw it as a SIMPLE readable hand-drawn fantasy game skill icon, not a finished card. Genuine transparent background. Square composition, subject fills central 85% with clear margins, clean dark brown outlines, broad flat colors and just one shadow tone, muted forest green, ivory steel and warm brass/brown. Readable at 100px. No texture noise, no tiny engravings, no scattered leaves, no particles, no glow or haze, no text, no frame. Keep fantasy equipment identity but simplify aggressively. Show a single brown leather boot with simple green cuff stepping forward, side three-quarter view, broad boot silhouette, one short trailing motion stroke. NO spear, no weapon, no circular wind; the boot and clear forward step are the entire symbol. Groundless transparent cutout.

### Sweep

Use case: style-transfer. Edit target is the supplied card illustration. Redraw it as a SIMPLE readable hand-drawn fantasy game skill icon, not a finished card. Genuine transparent background. Square composition, subject fills central 85% with clear margins, clean dark brown outlines, broad flat colors and just one shadow tone, muted forest green, ivory steel and warm brass/brown. Readable at 100px. No texture noise, no tiny engravings, no scattered leaves, no particles, no glow or haze, no text, no frame. Keep fantasy equipment identity but simplify aggressively. Show one short spear diagonally across the center of ONE broad near-complete circular green sweep arc. Strong ring silhouette with open center, clearly an attack around the user. No spiral inside, no starbursts, no duplicate spears, no glow. Ring and spear are the only two elements.

### DawnSpear

Use case: style-transfer. Edit target Image 1 is a fantasy ultimate skill illustration. Redesign to clearly communicate a powerful STRAIGHT PIERCING SPEAR attack, NOT a circular sweep. Genuine transparent background. Single centered upright diagonal gold-and-forest-green spear, thrusting from lower left toward upper right THROUGH two simple short broken impact slashes aligned along its straight path. One broad straight golden lance streak behind the shaft, no circular arc, no swirl, no leaves, no particles or fog. Square icon composition with complete silhouette inside 8% margins. Clean dark brown outlines, large readable flat color shapes, simple anime cel shading, minimal detail, no noisy texture or ornate engraving. Warm gold is primary color with deep green accents, clear dark outline so it reads on cream-colored card background. Visually more special than ordinary spear icon but just as uncluttered. Not a card frame, no text, no borders, no scenery, no characters. Readable at 100 pixels. Preserve spear equipment theme from reference, change the busy curved composition into a strong straight piercing silhouette.

