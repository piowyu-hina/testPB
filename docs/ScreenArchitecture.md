# Screen 結構

## 職責

- `src/main.ts`：應用程式組裝入口。建立共用 GameSession、掛載所有 Screen、註冊 ScreenManager，連接各畫面的導航 callback。
- `src/app/ScreenManager.ts`：統一切換顯示、進入／離開生命週期，並檢查 canLeave（例如戰鬥動畫期間禁止切換）。
- `src/app/GameSession.ts`：跨畫面的冒險狀態。回到據點不重置旅程，死亡／最終勝利後再次出發才建立新旅程。
- `src/screens/`：各自的 HTML 模板、DOM 查詢及互動。不得直接操作其他 Screen 的 DOM，也不匯入其他 Screen。
- `src/battle/`、`src/data/`：戰鬥規則及資料，不依賴 Screen 或 DOM。

目前狀態只保留在記憶體，沒有新增磁碟存檔。角色選擇、貨幣等功能確定後再加入相應資料模型。

## 新增畫面

1. 在 `src/screens/` 建立例如 `GuildScreen.ts`、`guild.html`，需要樣式時由該模組匯入 CSS。
2. 工廠函式使用 `mountScreenRoot(host, template)` 掛載自己的根節點，透過 `element(id, root)` 查找自己的元素。
3. 回傳 `Screen`：必須提供 `root`、`enter()`；有清理或切換限制時提供 `leave()`、`canLeave()`。
4. 在 `main.ts` 的 screens 註冊表加入 `guild`，由 callback 連接 `navigation.go('guild')` 與返回入口。畫面名稱由註冊表推導型別。
5. UI 初始化／事件綁定只在掛載時執行一次，`enter()` 只更新顯示。`leave()` 清除選取、提示與彈窗，不清除冒險狀態。

所有 Screen 在啟動時掛載一次，切換時只隱藏／顯示；此設計不提供動態卸載。主題按鈕在所有 Screen 掛載後由 `mountTheme()` 統一綁定。

彈窗須留在所屬 Screen 根節點內；戰鬥結果彈窗與 game 區塊為兄弟節點，避免被 game 的 inert 禁用。
DOM ID 仍需全應用唯一，讓 label、ARIA 與測試引用保持明確。

## 接下來的畫面

HomeScreen 現在是村莊畫面，提供地下城入口（置於畫面下方）與設定視窗；公會入口已移除。
DungeonScreen 顯示森林遺跡、出戰角色及目前進度；出發進入 BattleScreen，戰鬥返回村莊。
兩者共享 `hub.css` 的據點介面樣式，各自持有模板與事件。
地下城內的房間由 Journey 管理，不為每個房間建立 Screen。
目前森林遺跡有三房間戰鬥、刺芽團子與古木守衛技能循環（見 ForestMonsters.md），尚未新增休息或升級。

## 驗證

`npm test` 包含三畫面導航、切換阻擋、重複進入與冒險狀態保留測試。
`npm run test:browser` 和 `npm run desktop:check` 驗證實際操作、回首頁再續玩、清場出口、勝敗及重新開始。
