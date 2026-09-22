# 村莊立繪待機動畫

村莊主畫面的露雪立繪，用一組「待機搖擺」序列圖做逐幀動畫（呼吸、頭髮/披風擺動的細微差異），取代原本純靜態的 `Portrait.png`。戀喵沒有這組素材，仍是靜態立繪。

## 素材來源

- 序列圖是用另一個本機專案 `desktop-pet` 裡的 **Anime2.5DRig**（第三方 WebGL 即時綁定引擎，MIT License）搭配 `assets/characters/luxue/Portrait_clean.psd`（分層母檔）錄製、匯出的靜態影格，跟遊戲本身沒有任何執行期依賴——遊戲裡只有 14 張普通 PNG（`assets/characters/luxue/idle/frame-000.png` ~ `frame-013.png`），跟其他美術資源一樣單純 import。
- **不要把 Anime2.5DRig 這套引擎嵌進遊戲本體**（之前走過這條路，遇到一堆麻煩：巢狀 iframe 裡 WebGL 透明背景會變成不透明白塊、分頁不在前景時渲染迴圈會被瀏覽器節流、專案體積暴增）。它只在「產生新的待機序列圖」這個一次性美術製作步驟中使用，用完即丟。

## 怎麼重新產生序列圖（要換新姿勢/新角色時）

1. 到 `desktop-pet` 專案，用 `start.cmd` 或直接開 `Anime2.5DRig/index.html?psd=<角色的rig psd>` 確認待機動畫（眨眼、頭髮物理）跑起來正常。
2. 在瀏覽器主控台或注入一段小腳本，定時對 `#cv`（WebGL 畫布）做 `ctx.drawImage(cv, 0, 0, W, H)` 到一個普通 2D canvas，再 `toDataURL('image/png')` 存檔；建議降到 400×400 左右即可，原圖有大量透明留白，壓縮後每張約 150KB。
3. **重要**：WebGL context 建立時要加 `preserveDrawingBuffer:true`，不然背景分頁節流時讀出來的畫布內容可能是空的；另外瀏覽器分頁不在前景（例如被自動化工具或視窗切換蓋住）時 `requestAnimationFrame` 會被節流到幾乎不跑，每次擷取前最好先讓分頁重新取得一次渲染（例如觸發一次重繪/截圖）再讀取畫布，否則會擷到空白幀。
4. 抓 10~16 張分散在待機動作不同相位的影格即可，不需要湊成完美循環——遊戲裡的播放邏輯是「正著播一輪、倒著播一輪」（ping-pong），任何一組影格接起來都不會有跳幀感。
5. 把新的 PNG 序列放進 `assets/characters/<角色>/idle/`，在 `src/data/art.ts` 該角色物件補上 `idleFrames: [...]`（順序照影格編號），`HomeScreen.ts` 不用改。

## 播放邏輯

`HomeScreen.ts` 用一個 `setInterval`（`IDLE_FRAME_MS`，目前 220ms／張）在 `idleFrames` 陣列上來回播放；沒有 `idleFrames` 的角色（目前是戀喵）就直接顯示靜態 `portrait`。切換角色或離開村莊畫面時會清掉計時器，回來再重新啟動，避免背景空轉。
