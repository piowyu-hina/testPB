# 角色選擇

村莊立繪下方的「更換角色」開啟選擇視窗，提供露雪（rogue）與戀喵（pinkCat）。

`src/data/art.ts` 登錄每位角色的名字、立繪和棋子。`GameSession.characterId` 保存本次開啟期間的選擇，重新開啟預設露雪。切換不重置旅程；露雪使用飛刀牌組，戀喵使用基本牌組，切換規則見 `RogueCards.md`。

戀喵的正式圖片位於 `assets/characters/lianmiao/`；歷史圖稿位於 `art-previews/`。新增角色時擴充角色登錄即可出現在選擇視窗。
