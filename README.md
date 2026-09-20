# testPB

Tauri 2 + TypeScript + Vite 的獨立桌面遊戲原型。

## 遊玩

雙擊資料夾裡的 **testPB.exe**。它會開啟自己的視窗，不需要啟動 Node、Vite 或瀏覽器。遊戲和圖片都包含在執行檔裡，可離線使用；Windows 需要 WebView2 執行階段（這台電腦已安裝）。

原始 `index.html` 現在是開發入口，不再直接雙擊開啟。要看網頁開發版，執行 `npm run dev`。

## 操作

- 主畫面點「出發」進入戰鬥，角色立繪僅供展示，不提供放大或點擊操作。
- 戰鬥左上角可回主畫面，再點「繼續旅途」回到同一局；狀態只保留在這次開啟的視窗中，關閉程式不會存檔。
- 棋盤使用冒險者大頭圖。選牌後，綠框與圓點是可走的空格，紅框是可攻擊的敵人格；底部紅色菱形仍表示危險傷害。
- 點牌，再點框出的落點；再點同一張牌或棋盤外空白處可取消。
- 滑鼠停在合法落點，預覽移動、擊殺與剩餘危險。
- 每回合兩步，可提前結束。敵人先攻擊，再移動並預告下一輪。
- 暖色格表示危險，每個紅色菱形代表一點傷害。
- 短步（直向一格）、斜步（斜向一格）、突進（直向兩格，不能穿越）、躍步（斜向兩格，可跳過中間敵人）。只有落點攻擊。
- 開場位置與手牌固定；重玩會換後續洗牌。最後一隻敵人被擊敗即過關。
- 僅滑鼠／觸控操作，目前展示一位冒險者。

## 檔案分工

```text
src/
  types/game.ts             共用資料型別
  data/cards.ts             卡片定義：走法、穿越、張數
  data/enemies.ts           敵人規則定義
  data/art.ts               圖片引用的統一入口
  battle/Room.ts            戰鬥狀態、預覽與回合結算
  screens/BattleScreen.ts   戰鬥畫面和操作流程
  screens/HomeScreen.ts     主畫面、立繪查看
  ui/                      共用 DOM、步法圖案、動畫
  main.ts                   啟動入口
assets/                     既有角色 PNG
src-tauri/                  原生視窗、Rust 入口與權限設定
tests/                      規則、瀏覽器、原生視窗檢查
```

新增走法修改 `src/data/cards.ts`。卡牌圖和合法落點讀取同一份資料；相對座標 y 正值向上。圖片統一 import，路徑不存在時會在打包時報錯。戰鬥規則不依賴 DOM 或 Tauri。

## 開發

需求：Node.js、Rust MSVC 工具鏈、Visual Studio C++ 工具與 Windows SDK、WebView2。首次安裝後若舊終端機找不到 cargo，重新開啟終端機。

```sh
npm ci
npm run desktop:dev     # 原生開發視窗，前端修改即時更新
npm run desktop:build   # 前端檢查 + 獨立 exe；不製作安裝包
```

產物：`src-tauri/target/release/testpb.exe`。交付的 `testPB.exe` 是產物副本；重新編譯後需同步更新。執行中的 exe 需先關閉才能替換。

```sh
npm run typecheck
npm test
npm run build
npm run preview         # 另一個終端機供瀏覽器檢查使用
npm run test:browser
npm run desktop:check   # 編譯後，測真正的 Tauri/WebView2 視窗
```

開發套件不隨遊戲分發。`dist/`、Rust 編譯快取、測試產物和交付 exe 不進 Git。這次沒有做安裝包或簽署。

桌面檢查只在測試子程序設定本機除錯埠，正常啟動不會開啟。程式沒有檔案系統或命令執行權限，沒有遙測、CDN 或外部資產。

怪物沿用原有 imagegen 圖片；角色新增大頭與主畫面立繪。原始提示詞在 `docs/ArtPrompts.md`，新角色圖的提示詞在 `docs/CharacterArt.md`。
