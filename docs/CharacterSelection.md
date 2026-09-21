# 角色選擇

村莊立繪下方的「更換角色」開啟選擇視窗。提供莉娜（rogue）、粉色貓娘（pinkCat）；未命名的角色暫以外觀稱呼。白色貓娘已退出選角名單，原素材保留。

`src/data/art.ts` 登錄每位角色的名字、立繪和棋子。`GameSession.characterId` 保存本次開啟期間的選擇，重新開啟回到莉娜。各 Screen 進入時讀取選擇，返回既有戰鬥也會更新棋子和預覽。切換不重置旅程，卡牌與戰鬥規則共用。

粉色原圖保留在 characters 根目錄，正式副本位於 `assets/characters/pink-cat/`。新增角色時擴充 characters 登錄即可出現在選擇視窗。
