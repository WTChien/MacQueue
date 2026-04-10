# MacQueue

MacQueue 是辦公室內部共用 Mac Studio 的排隊與使用狀態系統。

目前為 Netlify 架構：靜態前端 + Netlify Functions + Netlify Blobs（已不使用 Flask/Python 伺服器）。

## 主要功能

- 即時顯示目前使用者與計時（MM:SS）
- 單一入口：在「預約佇列」輸入名字即可
- 空閒時可直接開始使用
- 忙碌中或等待確認中時，會加入排隊佇列
- 結束使用後，佇列下一位進入「等待確認」狀態
- 下一位必須按「開始使用」確認後，才開始計時
- 僅本人裝置可「結束使用」
- 其他裝置可執行「緊急結束」（二次確認 modal）
- 只能取消自己的排隊項目
- 支援可選 Google 登入（自動帶入名字，且可編輯）
- 支援訪客直接使用（不登入，每次自行輸入名字）
- **跨裝置身份辨識**：同一 Google 帳號在不同裝置上操作時，系統認可為同一人
- **訪客 → Google 綁定**：訪客使用中或排隊中時登入 Google，可選擇綁定為同一人或視為不同人
- PWA 加入主畫面提示與回呼按鈕
- 響應式設計（桌機/手機）

## 專案結構

- [index.html](index.html)：前端頁面（UI + 邏輯）
- [manifest.json](manifest.json)：PWA manifest
- [sw.js](sw.js)：service worker
- [netlify.toml](netlify.toml)：Netlify redirects / functions 設定
- [package.json](package.json)：Node.js 依賴與 scripts
- [netlify/functions/_lib/state.mjs](netlify/functions/_lib/state.mjs)：共用 state 讀寫
- [netlify/functions/status.mjs](netlify/functions/status.mjs)：狀態查詢
- [netlify/functions/queue-join.mjs](netlify/functions/queue-join.mjs)：加入排隊/空閒直接開始
- [netlify/functions/start-usage.mjs](netlify/functions/start-usage.mjs)：舊介面相容入口
- [netlify/functions/end-usage.mjs](netlify/functions/end-usage.mjs)：結束使用/緊急結束
- [netlify/functions/confirm-usage.mjs](netlify/functions/confirm-usage.mjs)：輪到後確認開始
- [netlify/functions/queue-cancel.mjs](netlify/functions/queue-cancel.mjs)：取消自己的排隊
- [netlify/functions/auth-reconcile-current.mjs](netlify/functions/auth-reconcile-current.mjs)：協調正在使用中的訪客身份
- [netlify/functions/auth-reconcile-queue-entry.mjs](netlify/functions/auth-reconcile-queue-entry.mjs)：協調排隊中的訪客身份
- [netlify/functions/auth-config.mjs](netlify/functions/auth-config.mjs)：回傳登入設定
- [netlify/functions/auth-google.mjs](netlify/functions/auth-google.mjs)：驗證 Google id token

## 技術架構

- 前端：原生 HTML / CSS / JavaScript
- API：Netlify Functions
- 儲存：Netlify Blobs（store: `macqueue`）
- 部署：Netlify

## 本機開發

需求：

- Node.js 18+
- npm

安裝依賴：

```bash
cd /Users/twinb00551172/Desktop/file/MacQueue
npm install
```

啟動：

```bash
npx netlify dev
```

網址：

```text
http://localhost:8888
```

也可使用專案內腳本：

```bash
./run.sh
```

## 部署到 Netlify

1. 推送到 GitHub。
2. 在 Netlify 連接 repo。
3. Build command：可留空或 `npm run build`
4. Publish directory：`.`
5. Functions directory：`netlify/functions`（已在 [netlify.toml](netlify.toml) 設定）

## Google 登入設定（可選）

若不設定，系統仍可正常以訪客模式使用。

1. 到 Google Cloud Console 建立 OAuth 2.0 Web Client。
2. 設定 Authorized JavaScript origins（至少包含正式網域；本機測試可加 `http://localhost:8888`）。
3. 在 Netlify 設定環境變數：

```text
GOOGLE_CLIENT_ID=你的 Google Web Client ID
```

4. 重新部署。

## API 一覽

| Method | Path | 說明 |
|---|---|---|
| GET | /api/status | 取得目前使用者、等待確認者、佇列 |
| POST | /api/queue/join | 單一入口：空閒可開始，否則加入佇列 |
| POST | /api/start-usage | 舊介面相容入口 |
| POST | /api/confirm-usage | 等待確認者按下開始使用 |
| POST | /api/end-usage | 結束使用（本人 token）或緊急結束 |
| POST | /api/queue/cancel | 取消自己的排隊（需 cancel token） |
| GET | /api/auth/config | 回傳 Google 登入 client id |
| P訪客 ↔ Google 身份協調流程

### 場景 1：訪客正在使用，登入 Google

1. 訪客以名字「訪客」進入，系統分配 `control_token` 並開始計時
2. 訪客登入 Google
3. 系統偵測本機有亮著的訪客使用，彈出「確認登入身分」modal：
   - **「是，同一人」**→ 當前使用者名字更新為 Google 名字，綁定 Google 身份。計時繼續。
   - **「不是同一人」**→ 結束當前訪客使用，狀態清空，佇列下一位被提升為「等待確認」。

### 場景 2：訪客在排隊，登入 Google

1. 訪客以名字「訪客」加入排隊，系統分配 `cancel_token`
2. 訪客登入 Google
3. 系統偵測本機有排隊的訪客，彈出「確認登入身分」modal：
   - **「是，同一人」**→ 排隊列表中該條目名字更新為 Google 名字，綁定 Google 身份。排隊位置不變。
   - **「不是同一人」**→ 移除該排隊條目。

### 場景 3：跨裝置操作（已登入 Google）

- 同一 Google 帳號在不同裝置上：
  - 在 A 裝置結束使用 → B 裝置也可直接結束使用（無需 `control_token`，靠 Google 身份驗證）
  - 在 A 裝置取消排隊 → B 裝置也可直接取消（靠 Google 身份驗證） /api/auth/google | 驗證 Google credential 並回傳 profile |

## 輪詢與效能

- 前景分頁：每 3 秒輪詢
- 背景分頁：每 15 秒輪詢
- 內建避免重疊請求

## 注意事項

- 資料儲存在 Netlify Blobs，不會自動從舊 `queue_data.json` 匯入
- 本機 `netlify dev` 與正式站資料獨立
- 若 `GOOGLE_CLIENT_ID` 未設定，登入按鈕不會可用，但訪客流程不受影響