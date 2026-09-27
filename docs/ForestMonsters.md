# 森林遺跡：六房間完整試玩版

## 苔角鹿靈試作（2026-09-27，取代最後一房古根之心）

最終房改為「苔角聖所」，單隻 8 生命鹿靈，不加小怪。衝撞（2 傷害直線）→ 喘息（不動、不攻擊）→ 角掃（1 傷害，前方及兩側相鄰五格、後方三格安全）。下回合方向只在敵方階段鎖定，玩家走動不追蹤。衝撞穿越亮起的直線並落在最遠未被佔用格，不與角色重疊；攻擊預告與實際傷害共用 EnemyRules。Boss 不可推動。起點不在首回合危險格，舊古根資料與素材保留但不再出場。

演出沿用紅色爪痕，不增加新箭頭、裝飾框或下方文字；衝撞實際平移，喘息保留綠葉提示。`tests/stag-browser.cjs` 檢查三階段、移位、圖片及視窗，`tests/stag-balance.cjs` 重現改版前後各 1,000 次完整六房模擬。相同策略與青禾牌組、不買強化：兩版均 1,000 次通關；Boss 平均回合 4.677 → 5.369、平均移動 6.322 → 8.799、平均受傷 0.010 → 0.172。只是節奏試作，仍偏容易，不代表真人難度合格。

新圖：`assets/monsters/forest/Mossstag.png`，內建 imagegen 生成，保留透明 PNG，未用 CLI。完整提示詞：

> Use case: stylized-concept. Asset type: transparent PNG enemy battle token for a cute 2D grid dungeon game. Draw ONE moss-antler deer spirit boss, entire body visible, centered in square canvas with 5% padding. Cute stout chibi quadruped deer, oversized head, short sturdy four legs, two broad branching wooden antlers with only a few large moss-green leaf clumps, cream muzzle and chest, warm taupe body, dark brown thick clean outlines, calm determined dark eyes. Slight three-quarter front view facing toward viewer. One simple vine around shoulder. Very simplified broad flat clean color regions and one cel-shadow tone per material, almost no texture. Clear powerful deer silhouette readable at 85px. Genuinely transparent background, no ground or shadow, no scenery, no text, no borders, no particles, no glowing aura, no tiny hair strands or scratches. Polished cute hand-drawn mobile boardgame sprite, not realistic, not 3D.

以下為舊六房版本紀錄，Boss 以本節為準。


### 本次新增三張怪物圖（2026-09-27）

內建 imagegen 生成，1254 × 1254 RGBA PNG，直接使用透明原圖，未做程式繪圖替代。噴孢菇參考原有團子／古木的線條；其餘使用下列獨立提示詞。已檢查原圖透明度及遊戲棋盤上的小尺寸辨識。

#### assets/monsters/forest/Sporecap.png

Use case: stylized-concept. Generate a NEW standalone 2D game monster token, using the two images ONLY as style references, not edit targets. A single cute squat mushroom monster: wide muted terracotta-red mushroom cap with ONLY three large cream spots, tiny cream stem-body, two stubby feet and two mitten-like arms, determined sleepy dark eyes. Distinct mushroom silhouette. No particles. Match their thick dark-brown outlines and chibi proportions; simplify to broad CLEAN FLAT COLOR regions and at most one hard-edged shadow per region. Full body centered with 8% empty margin, facing viewer with slight top-down game-token perspective. Entirely transparent alpha background, no ground, no tile, no cast shadow outside character, no frame, no text, no watermark. Square PNG. Must remain legible at 90px. Avoid gradients, texture, grain, tiny flecks, tiny details. Save-ready sprite for this game.

#### assets/monsters/forest/BrambleMoth.png

A transparent-background PNG sprite for a cute all-ages forest board game. A single cute forest moth monster: four broad moss-green and pale cream wings, short rounded plum-brown body, two simple curled antennae, large determined dark eyes. Wings spread symmetrically in a compact diamond silhouette, only one broad patch per wing. No fine veins, no particles. Thick dark brown cartoon outlines, broad simple flat colors, very sparse clean cel shadows, no texture or grain or realism. One full-body character centered with 8 percent margin on all sides, compact chibi proportions like a children's storybook mascot, legible at 90px. Warm tan, moss green, cream and plum palette. No words, background, ground, particle effects, frame or watermark. This is a friendly fantasy woodland creature illustration.

#### assets/monsters/forest/Rootwarden.png

A transparent-background PNG sprite for a cute all-ages forest board game. A single forest boss called Rootwarden: squat ancient living tree creature, broad tan wood trunk body with stern but cute dark eyes, two hefty root fists, short root feet, a forked antler-like branch crown bearing just four broad moss-green leaves, one large warm amber acorn-shaped heart set in its chest. More imposing than the stump reference but still very cute, not scary. Broad uncluttered silhouette, very few bark divisions. No crown jewelry, no particles. Thick dark brown cartoon outlines, broad simple flat colors, very sparse clean cel shadows, no texture or grain or realism. One full-body character centered with 8 percent margin on all sides, compact chibi proportions like a children's storybook mascot, legible at 90px. Warm tan, moss green, cream and plum palette. No words, background, ground, particle effects, frame or watermark. This is a friendly fantasy woodland creature illustration.


## 規則

| 怪物 | 下次技能 | 防護／移動 |
| --- | --- | --- |
| 刺芽團子 | 刺擊：上下左右一格，1 傷害 | 結算後，未在攻擊距離內的團子靠近一格 |
| 古木守衛・揮枝 | 正前方一格，1 傷害 | 正面同一直線來的攻擊被擋住；側面、背面、斜角可攻擊。結算後原地切換扎根 |
| 古木守衛・扎根 | 四個斜角相鄰格，1 傷害 | 正面防護解除；結算後切換揮枝，必要時靠近一格，朝向玩家 |
| 噴孢菇 | 周圍八格噴孢，1 傷害；之後休息一回合 | 不自行移動，可以推動；開場休息 |
| 荊翅蛾 | 四條斜線各延伸兩格，1 傷害 | 攻擊後，未在射程內才靠近一格 |
| 古根之心（Boss） | 十字長線 → 斜角長線 → 休息，攻擊各 2 傷害 | 8 生命，不移動、不能推動、沒有正面格擋；開場休息 |

古木固定交替，玩家出牌期間不換招、不轉向。各怪物的已預告攻擊先一起結算，再移動及準備下次技能。
團子及荊翅蛾為 1 生命，噴孢菇與普通古木為 2 生命，精英古木為 3 生命。精英古木基本攻擊造成 2 傷害。怪物站在小刀格時攻擊傷害增加 1，離開便失效。
格擋仍消耗玩家的卡片及一次行動，但不傷害怪物，角色退回原位；預覽顯示該落點及接下來的傷害。
非致死攻擊同樣會退回原位；擊殺才移入怪物所在格。

路線依序為：林緣遭遇（團子）→ 孢霧石徑（噴孢菇＋團子）→ 古木伏擊（兩隻古木＋團子）→ 荊翅迴廊（兩隻蛾＋噴孢菇）→ 遺跡守衛（精英古木＋三種小怪）→ 古根之心（Boss＋團子）。
保留清房後走出口、換房回血 1、生命上限 5、商店與逐張強化。全部房間開場安全，Boss 開場休息讓玩家有機會調整站位。這是可完整通關的首版配置，仍需真人試玩調整難度。

## 模組

- `data/enemies.ts`：每種怪物的技能循環與描述。
- `battle/EnemyRules.ts`：當前技能、攻擊範圍、正面格擋與朝向。
- `battle/Room.ts`：預覽、攻擊、回合階段與移動。
- `ui/enemyInfo.ts`：共用資訊行中的怪物名字與生命格式。
- `enemy.css`：技能視覺標記與格擋預覽。

滑鼠移入怪物時，上方資訊列顯示目前技能與規則，生命用愛心呈現；下方 HUD 不新增文字。攻擊範圍沿用棋盤紅色爪印，結算前也短暫顯示，避免落空時像沒有出招。噴孢菇／Boss 頭上使用小型技能形狀標記；休息顯示綠葉，Boss 攻擊分十字及斜十字。

## 驗證

`npm test` 包含全怪物技能階段的預告／實際傷害一致性、青禾五種卡片預覽一致性、Boss 不可推動與多種洗牌完整旅程測試。100 組固定種子自動策略通關 97 組，僅作回歸與基本可玩性檢查，不代表真人難度評分。
`node tests/forest-browser.cjs` 使用滑鼠從第一房打到 Boss，驗證三階段、出口、勝利、死亡與重開。設定 `TESTPB_CHECK_SCRIPT=tests/forest-browser.cjs` 後執行 `node tests/qinghe-native.cjs` 可在真正 Tauri 視窗重跑。

## 美術

使用內建 GPT Image / image_gen，未使用 CLI。生成結果直接複製，保留透明背景：

- `assets/monsters/forest/ThornSprout.png`
- `assets/monsters/forest/StumpGuard.png`

舊 `Imp.png`、`Bat.png` 不再由遊戲匯入，保留作歷史素材，本次沒有刪除。

### 刺芽團子完整提示詞

Use case: stylized-concept. Create one isolated forest monster game sprite named Thorn Sprout, on a genuinely transparent background. Full body centered, square 1024x1024 canvas, entire silhouette inside canvas with 10 percent transparent padding. A cute squat round green plant dumpling with two short feet, two large sprout leaves on top, three broad short ivory thorns on its sides, tiny dark eyes with a determined frown. Front view with subtle top visibility, for a 5x5 tactical board rendered at only 80 pixels. Broad simple silhouette, thick dark brown outlines, flat sage green and light yellow-green cel shading, 3 main color areas, no tiny detail, no texture, no grass ground, no cast shadow, no aura, no text, no border, no other objects. Clean mascot illustration, adorable but mildly hostile. Not pixel art, not realistic, not a sheet. Transparency outside character.

### 古木守衛完整提示詞

Use case: stylized-concept. One isolated Ancient Stump Guard forest monster sprite, genuinely transparent background, full body front view centered square canvas 1024x1024 with 10 percent transparent padding. Cute squat chunky cylindrical tree stump mascot, thick tan bark armor on chest, two tiny dark eyes beneath heavy bark brows, dark knot mouth, broad flat cut top with one simple growth ring, two short branch arms held to sides, two stubby root feet, a small sage moss cap. Broad simple silhouette, thick dark brown outlines, flat warm ochre and muted brown cel shading, few large color areas, just two bark grooves. Must be readable at 80px in a tactical board game. Adorable yet sturdy, no weapons, no leaves covering face, no thin twigs, no intricate textures, no ground, no shadow, no aura, no text, no border. Match a simple round green plant monster mascot art style. Not realistic, not pixel art, single sprite not a sheet. Transparent outside character.
