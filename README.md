# MacQueue

MacQueue 是一個給辦公室內部使用的共用 Mac Studio 排隊系統。

目前版本已從 Flask 改為可直接部署到 Netlify 的形式：靜態前端 + Netlify Functions + Netlify Blobs。

## 功能

- 單頁面 Dashboard，顯示目前使用者與計時（MM:SS）
- 單一入口操作：使用者只需在下方「預約佇列」輸入名字
- 若目前空閒：直接開始使用
- 若目前有人使用：加入排隊佇列
- 結束使用時自動遞補佇列第一位
- 可取消排隊
- 桌面通知
- 目前使用者可收到「有人加入排隊」通知
- PWA 加入主畫面提示，並提供右下角圓形按鈕重新喚回提示
- 響應式設計，適合手機查看

## 專案結構

- [index.html](index.html)：靜態前端頁面
- [manifest.json](manifest.json)：PWA manifest
- [sw.js](sw.js)：service worker
- [netlify.toml](netlify.toml)：Netlify 設定與 API redirects
- [package.json](package.json)：Node.js 依賴與 scripts
- `netlify/functions/*.mjs`：Netlify Functions API
- `netlify/functions/_lib/state.mjs`：共用資料讀寫邏輯

## 技術架構

- 前端：原生 HTML / CSS / JavaScript
- API：Netlify Functions
- 資料儲存：Netlify Blobs
- 部署平台：Netlify

## 本機開發

需求：

- Node.js 18+
- npm

安裝依賴：

```bash
cd /Users/twinb00551172/Desktop/file/MacQueue
npm install
```

啟動本機開發：

```bash
npx netlify dev
```

啟動後通常可在以下網址查看：

```text
http://localhost:8888
```

如果本機尚未安裝 Netlify CLI，`npx` 會自動下載執行。

## 部署到 Netlify

1. 將專案 push 到 GitHub。
2. 在 Netlify 建立新站並連接這個 repo。
3. Build command 可留空，或填入：

```text
npm run build
```

4. Publish directory 設為：

```text
.
```

5. Functions directory 已在 [netlify.toml](netlify.toml) 設定為：

```text
netlify/functions
```

部署後前端仍用 `/api/*` 呼叫 API，Netlify 會透過 redirects 自動轉到 Functions。

## API

| Method | Path | 說明 |
|---|---|---|
| GET | `/api/status` | 取得目前使用者、開始時間、佇列 |
| POST | `/api/start-usage` | 相容舊接口；空閒直接使用，忙碌則入列 |
| POST | `/api/queue/join` | 單一入口，空閒直接使用，忙碌則加入佇列 |
| POST | `/api/end-usage` | 結束目前使用 |
| POST | `/api/queue/cancel` | 取消排隊 |

## 輪詢與效能

- 前景頁面每 3 秒更新一次狀態
- 背景分頁每 15 秒更新一次狀態
- 避免重疊請求，上一個請求未完成時不會重送

## 資料儲存

正式環境資料存放在 Netlify Blobs 的 `macqueue` store。

這代表：

- 不再需要 Python / Flask
- 不再使用 `requirements.txt`
- `queue_data.json` 不再是正式資料來源

## 注意事項

- Netlify Blobs 預設是雲端資料，不會自動從舊的 `queue_data.json` 匯入
- 若要保留舊資料，需要另外寫一次性 migration
- 本機用 `netlify dev` 時，Blobs 會使用本機開發環境的儲存，不是正式站資料

## 常見問題

### Chrome 沒跳「加入主畫面」？

- 先確認是用 Chrome 開啟
- 重新整理頁面後看右下角小圓形按鈕（📲）
- 點按可重新打開加入主畫面提示

### 為什麼沒有後端伺服器？

因為 Netlify 不執行長駐 Python Flask 伺服器，這個版本已改成靜態頁面搭配 Netlify Functions。

### 舊的 `queue_data.json` 會自動搬過去嗎？

不會。Netlify 版本會從空白狀態開始，之後資料都寫入 Blobs。