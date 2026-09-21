# 森林遺跡：第一批怪物

## 規則

| 怪物 | 下次技能 | 防護／移動 |
| --- | --- | --- |
| 刺芽團子 | 刺擊：上下左右一格，1 傷害 | 結算後，未在攻擊距離內的團子靠近一格 |
| 古木守衛・揮枝 | 正前方一格，1 傷害 | 正面同一直線來的攻擊被擋住；側面、背面、斜角可攻擊。結算後原地切換扎根 |
| 古木守衛・扎根 | 四個斜角相鄰格，1 傷害 | 正面防護解除；結算後切換揮枝，必要時靠近一格，朝向玩家 |

古木固定交替，玩家出牌期間不換招、不轉向。各怪物的已預告攻擊先一起結算，再移動及準備下次技能。
普通怪物皆為 1 生命，精英古木為 2 生命、每次命中造成 2 傷害。
格擋仍消耗玩家的卡片及一次行動，但不傷害怪物，角色退回原位；預覽顯示該落點及接下來的傷害。
非致死攻擊同樣會退回原位；擊殺才移入怪物所在格。

第一間只出現刺芽團子；第二間介紹分別處於揮枝／扎根的兩隻古木；第三間為精英古木加刺芽團子。
這是第一版規則與配置，並非已完成全部森林怪物或新頭目技能。

## 模組

- `data/enemies.ts`：每種怪物的技能循環與描述。
- `battle/EnemyRules.ts`：當前技能、攻擊範圍、正面格擋與朝向。
- `battle/Room.ts`：預覽、攻擊、回合階段與移動。
- `ui/enemyInfo.ts`：當前技能的標記與說明。
- `enemy.css`：技能標記、格擋預覽與說明面板。

未選牌時點怪物可固定說明；滑鼠移入也可查看範圍。說明面板顯示下一個敵方回合的技能；揮枝時另列出古木的朝向（防守正面）。

## 美術

使用內建 GPT Image / image_gen，未使用 CLI。生成結果直接複製，保留透明背景：

- `assets/monsters/forest/ThornSprout.png`
- `assets/monsters/forest/StumpGuard.png`

舊 `Imp.png`、`Bat.png` 不再由遊戲匯入，保留作歷史素材，本次沒有刪除。

### 刺芽團子完整提示詞

Use case: stylized-concept. Create one isolated forest monster game sprite named Thorn Sprout, on a genuinely transparent background. Full body centered, square 1024x1024 canvas, entire silhouette inside canvas with 10 percent transparent padding. A cute squat round green plant dumpling with two short feet, two large sprout leaves on top, three broad short ivory thorns on its sides, tiny dark eyes with a determined frown. Front view with subtle top visibility, for a 5x5 tactical board rendered at only 80 pixels. Broad simple silhouette, thick dark brown outlines, flat sage green and light yellow-green cel shading, 3 main color areas, no tiny detail, no texture, no grass ground, no cast shadow, no aura, no text, no border, no other objects. Clean mascot illustration, adorable but mildly hostile. Not pixel art, not realistic, not a sheet. Transparency outside character.

### 古木守衛完整提示詞

Use case: stylized-concept. One isolated Ancient Stump Guard forest monster sprite, genuinely transparent background, full body front view centered square canvas 1024x1024 with 10 percent transparent padding. Cute squat chunky cylindrical tree stump mascot, thick tan bark armor on chest, two tiny dark eyes beneath heavy bark brows, dark knot mouth, broad flat cut top with one simple growth ring, two short branch arms held to sides, two stubby root feet, a small sage moss cap. Broad simple silhouette, thick dark brown outlines, flat warm ochre and muted brown cel shading, few large color areas, just two bark grooves. Must be readable at 80px in a tactical board game. Adorable yet sturdy, no weapons, no leaves covering face, no thin twigs, no intricate textures, no ground, no shadow, no aura, no text, no border. Match a simple round green plant monster mascot art style. Not realistic, not pixel art, single sprite not a sheet. Transparent outside character.
