# Fit Track — Claude 專案說明

LINE 官方帳號健身房簽到管理系統，**多租戶 SaaS 架構**，支援多間健身房共用同一套後端。學員透過 LINE LIFF 簽到，教練透過網頁後台管理出勤與堂數方案，營運方透過 Operator 後台管理各健身房。

---

## 專案架構

```
fit-track/
├── backend/     Node.js + Express，部署在 Render
├── liff/        Vue 3 學員端 LIFF，部署在 Vercel
└── admin/       Vue 3 教練後台（含 Operator 後台），部署在 Vercel
```

---

## 部署資訊

| 服務 | URL |
|------|-----|
| 後端 API | https://fit-track-api-94nn.onrender.com |
| 學員 LIFF | https://fit-track-liff.vercel.app |
| 教練後台 | https://fit-track-admin.vercel.app |
| Supabase | https://vmpudqnfwnnzekplmgjd.supabase.co |

- **Render 免費方案**：閒置 15 分鐘後冷啟動，第一次請求需等 30-60 秒
- **GitHub**：git@github.com:Hungred/fit-track.git
- **LIFF ID / LINE 憑證**：每間健身房各自設定，儲存在 `gyms` 資料表，不再寫死在 env

---

## 環境變數

### backend/.env
```
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPER_ADMIN_PASSWORD=          # 營運方後台密碼（取代舊的 ADMIN_PASSWORD）
NOTIFY_SECRET=                 # 課程提醒 cron 驗證金鑰（cron-job.org 呼叫 /api/notify/class-reminders 時帶入）
FRONTEND_URL=https://fit-track-liff.vercel.app
ADMIN_URL=https://fit-track-admin.vercel.app
PORT=3000
```

> LINE_CHANNEL_SECRET / LINE_CHANNEL_ACCESS_TOKEN / LIFF_ID 已移至 Supabase `gyms` 表，不再放 env

### liff/.env
```
VITE_API_URL=https://fit-track-api-94nn.onrender.com
VITE_LIFF_ID=2010531115-c2Psq9el
```

### admin/.env
```
VITE_API_URL=https://fit-track-api-94nn.onrender.com
```

> 實際值在 Render Dashboard / Vercel Dashboard 的 Environment Variables 裡查

---

## 資料庫（Supabase）

9 張資料表，後端使用 `service_role` key 繞過 RLS。**所有業務資料表都有 `gym_id` 欄位**做多租戶隔離。

| 資料表 | 說明 |
|--------|------|
| `gyms` | 健身房主檔，含 LINE 憑證（`line_channel_secret`、`line_channel_access_token`、`liff_id`）、`admin_password`、`status`（`active` / `suspended`） |
| `members` | 學員與教練，`role` 欄位區分（`member` / `coach`），含 `gym_id` |
| `packages` | 堂數方案範本，含 `price`、`price_per_session`、`price_total`、`valid_days`，含 `gym_id` |
| `member_packages` | 學員持有的方案，含剩餘堂數 `remaining_sessions`，含 `gym_id` |
| `checkins` | 簽到記錄，`method` = `button` / `qr` / `manual`，含 `gym_id` |
| `qr_tokens` | QR Code token，掃完失效，含 `gym_id` |
| `leaves` | 請假記錄，`member_id`、`leave_date`（DATE）、`reason`，含 `gym_id`，`(member_id, leave_date, gym_id)` 唯一鍵 |
| `classes` | 課程主檔，含 `coach_id`、`start_at`、`end_at`（TIMESTAMPTZ）、`max_students`、`notes`、`gym_id` |
| `class_enrollments` | 學員出席記錄，`status` = `pending` / `confirmed` / `leave` / `discuss` / `attended`，`(class_id, member_id)` 唯一鍵，`reminded_at`（TIMESTAMPTZ，推播提醒後寫入，防重複發送） |
| `spaces` | 可租借場地主檔，`name`、`description`、`price_per_hour`、`capacity`、`available_days`（integer[]，0=日~6=六）、`open_time`/`close_time`（TIME）、`is_active`、`gym_id` |
| `space_bookings` | 場地預約記錄，`space_id`、`renter_name`、`renter_phone`、`renter_line_uid`、`start_at`/`end_at`（TIMESTAMPTZ，支援跨午夜）、`total_hours`、`total_price`、`status`（`pending`/`confirmed`/`cancelled`）、`notes`、`gym_id` |

**members 表新增欄位**（多教練支援）：`username`（TEXT UNIQUE per gym）、`coach_password`（TEXT，bcrypt hash）、`permissions`（JSONB array）、`is_owner`（BOOLEAN）

**重要**：`checkins` 有兩個 FK 指向 `members`（`member_id` 和 `created_by`），Supabase join 時必須用明確的 FK 欄位名稱：
```js
// 正確
.select('*, member:member_id(name), member_package:member_package_id(package:package_id(name))')
// 錯誤（ambiguous）
.select('*, member:members(name)')
```

---

## 後端路由結構

### 多租戶機制
所有業務路由（`/api/auth`、`/api/members`、`/api/checkin`、`/api/coach`）都先過 `requireGym` middleware，從 `x-gym-id` header 驗證健身房存在且 `status = active`，並把 gym 物件注入 `req.gym`。

### 認證 middleware
| Middleware | 作用 |
|---|---|
| `requireGym` | 驗證 `x-gym-id` header，注入 `req.gym` |
| `requireMember` | 驗證 `x-line-uid`，確認學員存在於該健身房，注入 `req.member` |
| `requireCoach` | 驗證 `x-line-uid`，確認 `role = coach` 且屬於該健身房 |
| `requireOperator` | 驗證 `x-operator-password` = `SUPER_ADMIN_PASSWORD` |

### 路由清單

```
# 營運方（不需 x-gym-id）
POST   /api/operator/login              營運方密碼登入
GET    /api/operator/gyms               列出所有健身房（含學員數、本月出勤數）
GET    /api/operator/gyms/:id           取得單一健身房
POST   /api/operator/gyms               新增健身房（自動建立預設教練帳號）
PATCH  /api/operator/gyms/:id           更新健身房（名稱、LINE 憑證、狀態等）
DELETE /api/operator/gyms/:id           刪除健身房（有學員時擋）

# LINE Webhook（per-gym，用各館的 line_channel_secret 驗簽名）
POST   /webhook/:gymId                  LINE Webhook（每間健身房在 LINE Console 設各自的 URL）

# 以下皆需 x-gym-id header

# 教練後台登入
POST   /api/auth/login                  帳號密碼登入，回傳 coach line_uid + permissions
POST   /api/auth/change-password        變更自己的登入密碼（requireCoach）

# 學員端（requireMember 驗 x-line-uid）
POST   /api/members/bind                綁定學員（姓名、電話）
GET    /api/members/me                  取得學員資料 + 方案
GET    /api/members/me/checkins         學員出勤記錄
GET    /api/members/me/leaves           學員請假記錄
POST   /api/members/me/leave            申請請假（body: leave_date, reason）
DELETE /api/members/me/leave            取消請假（body: leave_date）
GET    /api/members/me/classes          學員課程邀請清單（近 7 天 + 未來）
PATCH  /api/members/me/classes/:classId 學員更改出席狀態（confirmed/leave/discuss，attended 不可覆蓋）

# 簽到
POST   /api/checkin                     學員簽到（requireMember，body: method, qr_token）
POST   /api/checkin/manual              教練手動補登（requireCoach）

# 教練後台（requireCoach 驗 x-line-uid + role=coach）
GET    /api/coach/dashboard             出勤總覽
GET    /api/coach/checkins              所有出勤記錄
GET    /api/coach/report                月報表統計
GET    /api/coach/leaves                今日請假名單（query: date）
POST   /api/coach/qr-token              產生 QR Code token

GET    /api/coach/packages              方案列表
POST   /api/coach/packages              新增方案
PATCH  /api/coach/packages/:id          編輯方案
DELETE /api/coach/packages/:id          刪除方案（有學員使用中則擋）
POST   /api/coach/packages/assign       指派方案給學員

PATCH  /api/coach/member-packages/:id/adjust  調整學員剩餘堂數
PATCH  /api/coach/member-packages/:id         更新學員方案
DELETE /api/coach/member-packages/:id         刪除學員方案

PATCH  /api/coach/checkins/:id          更新簽到記錄
DELETE /api/coach/checkins/:id          刪除簽到記錄

GET    /api/coach/coaches               教練列表（requireCoach）
POST   /api/coach/coaches               新增教練（requireOwner）
PATCH  /api/coach/coaches/:id           編輯教練（requireOwner）
DELETE /api/coach/coaches/:id           刪除教練（requireOwner，不可刪自己或 is_owner）

GET    /api/coach/classes               課程列表（query: month）
POST   /api/coach/classes/batch         批次新增多堂課程並推播 LINE 邀請
POST   /api/coach/classes               新增課程並推播 LINE 邀請
GET    /api/coach/classes/:id                        課程詳細（含出席狀態）
PATCH  /api/coach/classes/:id                        編輯課程
PATCH  /api/coach/classes/:id/enrollments/:memberId  教練修改學員出席狀態
DELETE /api/coach/classes/:id                        刪除課程

# 公開路由（不需認證）
GET    /api/classes/:id/ical            下載課程 iCal 檔案

# 課程提醒（不需 x-gym-id，需 ?secret=NOTIFY_SECRET）
GET    /api/notify/class-reminders      掃描 50–70 分鐘內開始課程，對 confirmed 且 reminded_at IS NULL 的學員推播提醒；由 cron-job.org 每 5 分鐘觸發

# 場地管理（需 x-gym-id）
GET    /api/spaces                      場地列表（公開，LIFF 可讀）
POST   /api/spaces                      新增場地（requireCoach）
PATCH  /api/spaces/:id                  編輯場地（requireCoach）
DELETE /api/spaces/:id                  刪除場地（requireCoach）
GET    /api/spaces/bookings             預約列表（requireCoach，query: month, status）
POST   /api/spaces/bookings             送出預約（公開，LIFF 可呼叫）
PATCH  /api/spaces/bookings/:id         編輯 / 確認 / 取消預約（requireCoach，確認時推播 LINE）
DELETE /api/spaces/bookings/:id         刪除預約（requireCoach）
```

---

## 前端說明

### LIFF（學員端）
- 入口 URL 帶 `?gym=<gym_id>`，store 讀取後存 localStorage 並設 `x-gym-id` header
- `stores/user.js`：`loading` 預設 `true`，避免 LIFF init 完成前 router guard 就跳轉
- `App.vue`：先判斷 `initError` → `loading` → 才渲染 `RouterView`，解決 Render 冷啟動問題
- `vercel.json`：SPA routing 需要 rewrites，否則重新整理會 404
- API 模組：`memberApi`、`checkinApi`、`leaveApi`、`spaceApi`
- 頁面：`/`（簽到）、`/bind`（綁定）、`/history`（出勤記錄）、`/classes`（我的課程）、`/space-booking`（場地租借）、`/leave`（請假申請）
- `/space-booking` 允許**未綁定學員**進入（router guard 特例），使用 `liff.getProfile()` 取得 LINE UID
- `/leave` 為獨立請假申請頁，橘色主題，含請假歷史記錄與取消功能

### Admin（教練後台）
- 入口 URL 帶 `?gym=<gym_id>` 設定健身房，router guard 讀取並存 localStorage
- `stores/auth.js`：store 建立時立刻從 `localStorage` 讀 `coach_uid` 和 `gym_id`，並同步設好 axios header
- 登入方式：密碼（存在 `gyms` 表的 `admin_password`），不需要輸入 LINE UID
- 路由：`/login`、`/`（dashboard）、`/members`、`/members/:id`、`/packages`、`/qr`、`/report`、`/classes`、`/coaches`、`/spaces`（場地管理）、`/space-bookings`（場地預約管理）
- 側欄依 `permissions` 動態顯示；`is_owner` 才看得到「教練管理」
- `stores/auth.js` 登入後存 `permissions`（JSONB array）與 `is_owner` 至 localStorage
- **Operator 後台**（路由不受教練 auth guard 控制）：
  - `/operator/login`：營運方密碼登入（`localStorage` 存 `operator_password`）
  - `/operator`：管理所有健身房的 CRUD、停用/啟用、複製後台連結
- **MPA（多頁面）架構**：`index.html`（健身房後台）和 `operator.html`（營運後台）是兩個獨立入口
  - `vite.config.js` 的 `build.rollupOptions.input` 同時編譯兩個 HTML
  - `vercel.json` rewrites：`/operator*` → `operator.html`，其他 → `index.html`
  - 各自有獨立的 favicon、`<link rel="manifest">`、theme-color，不靠 JS 動態切換
  - 健身房後台：綠色啞鈴圖示（`favicon.svg`、`manifest.json`、theme `#16a34a`）
  - 營運後台：藍色筆記本圖示（`favicon-operator.svg`、`manifest-operator.json`、theme `#2563eb`）
  - `manifest-operator.json` 有 `scope: "/operator"` 和 `id: "/operator"`，讓 iOS 識別為獨立 app
- **PWA gym_id 持久化**：
  - iOS 17+ 主畫面捷徑的 localStorage 與 Safari 隔離，但 **cookie 是共用的**
  - `stores/auth.js` 的 `setGym()` 同時寫入 localStorage 和 cookie（`max-age=31536000`）
  - store 初始化時 `localStorage.getItem('gym_id') || getCookieGymId()`，確保捷徑開啟也能讀到 gym_id
  - `admin/api/manifest.js`：Vercel serverless function，回傳帶 `start_url: "/?gym=<id>"` 的動態 manifest
  - router guard 偵測到 `?gym=` 時更新 `<link rel="manifest">` href 指向動態 manifest URL
- **PWA safe area**：`viewport-fit=cover` 讓內容延伸到狀態列，fixed header 需加 `padding-top: env(safe-area-inset-top)`；`Layout.vue` 手機 header 和 main 都已加，`OperatorPage` / `OperatorLoginPage` header 也已加
- **Admin 頂部 padding**：`Layout.vue` 的 `<main>` 移除 `lg:pt-0`，桌面版和手機版都加 padding，手機版用 `padding-top: calc(3.5rem + env(safe-area-inset-top) + 1rem)` 確保標題不貼頂
- **ClassesPage 月曆雙事件來源**：`loadEvents()` 同時撈課程 + 場地預約，預約以紫色顯示（pending 淺紫 `#a78bfa`，confirmed 深紫 `#7c3aed`），點擊顯示預約詳情 dialog
- **401 interceptor**：`api/index.js` 的 401 handler 只在非 `/operator*` 路徑才跳轉到健身房登入頁，避免 operator API 失敗時跑到錯誤頁

---

## 已完成功能

- [x] LINE LIFF 學員綁定（姓名、電話）
- [x] 學員簽到（按鈕），自動扣堂，防當天重複簽到
- [x] 學員出勤記錄頁
- [x] 教練後台密碼登入，登入狀態保持
- [x] 出勤總覽（今日已簽到標示）
- [x] 堂數方案管理（新增、編輯、刪除，刪除前檢查是否有學員使用）
- [x] 指派方案給學員
- [x] 學員詳細頁（方案列表、出勤記錄、手動調整堂數）
- [x] 教練補登功能
- [x] 堂數不足（≤2堂）自動推播 LINE Flex Message
- [x] QR Code 簽到（教練後台產生，10 分鐘有效，自動刷新）
- [x] 月報表統計（總出勤次數、出勤人數、學員明細、簽到方式分布）
- [x] 請假功能（學員 LIFF 請假/取消、教練後台今日請假統計與標記）
- [x] 多租戶架構（Operator 後台管理多間健身房，LINE 憑證 per-gym 存 DB）
- [x] 營運後台統計：健身房總數、營運中數量、平台總學員數
- [x] LINE 新學員歡迎訊息（follow 事件觸發 Flex Message，含功能說明與立即綁定按鈕）
- [x] 教練變更自己的登入密碼（Admin 後台側欄底部「變更密碼」）
- [x] 多教練帳號 + 細粒度權限管理（`members` 表加 username/coach_password/permissions/is_owner，20 個 permission key）
- [x] 排課系統（FullCalendar 月曆＋週視圖、事件顏色依確認狀態區分：灰=無學員/橘=待確認/綠=全確認）
- [x] 批次新增課程（一次填多時段、送出前預覽、推播 LINE 邀請）
- [x] LINE Flex Message 課程邀請、postback 確認/請假/討論、iCal 匯出
- [x] LIFF 課程清單頁（學員查看即將上課的邀請與狀態，可直接在 LIFF 更改狀態）
- [x] 課程報名互動：pending 可確認/請假/討論；confirmed 可請假或討論；leave 可改確認或討論；discuss 顯示「等待教練回覆」；attended 不顯示按鈕
- [x] 打卡自動出席：簽到成功時自動將前後 2 小時內的課程 enrollment 更新為 attended
- [x] 課程開始前 1 小時推播提醒：`GET /api/notify/class-reminders?secret=NOTIFY_SECRET`，掃描 50–70 分鐘內開始的課程，對 `confirmed` 且 `reminded_at IS NULL` 的學員推播 LINE Flex Message，發送後寫入 `reminded_at` 防重複；由 cron-job.org 每 5 分鐘觸發
- [x] LINE 按鈕重複點擊防護：已回覆過（非 pending）時回覆提示訊息，attended 顯示「已完成打卡」
- [x] Admin 課程詳情：教練可用下拉選單直接修改學員出席狀態
- [x] LIFF 圖文選單（立即簽到、我的堂數、出勤記錄、我的課程 四格）
- [x] Admin RWD（平板/手機版，手機用漢堡選單 + 抽屜側欄；學員/教練管理 Table 改手機卡片；所有 Dialog 改響應式寬度 `min(Xpx, 92vw)`；方案管理 Grid 改 `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`；月報表統計卡字型 `text-2xl lg:text-4xl`；排課管理手機改 `listMonth` 清單視圖，桌面保持月曆）
- [x] PWA 支援（加入主畫面捷徑，各自獨立圖示與 manifest）
- [x] 場地租借系統：`spaces` + `space_bookings` 資料表；Admin 後台 SpacesPage（場地 CRUD）與 SpaceBookingsPage（預約管理、確認推播 LINE）；ClassesPage 月曆整合場地預約（紫色事件）；LIFF `/space-booking` 4 步驟預約流程（選場地→選時間→填資料→成功），允許未綁定學員操作
- [x] LIFF `/leave` 獨立請假申請頁（橘色主題，含請假表單、歷史記錄、取消功能）
- [x] LINE 圖文選單更新為 2×3（6 格）：立即簽到、我的堂數、租借場地、出勤記錄、我的課程、請假申請；PNG 檔在 `~/Desktop/fit_track_richmenu.png`（2500×1686px，Python Pillow 產生，暖棕/米白棋盤格設計）

---

## 待完成功能

目前無待辦。

## 權限 Key 清單

| 側欄 | Key | 說明 |
|------|-----|------|
| 出勤總覽 | `dashboard:view` | 查看今日統計與請假名單 |
| | `dashboard:checkin_manual` | 手動補登 |
| 學員管理 | `members:list` | 查看學員列表 |
| | `members:view` | 查看學員詳細頁 |
| | `members:assign_package` | 指派方案給學員 |
| | `members:delete_package` | 刪除學員持有的方案 |
| | `members:adjust_sessions` | 調整剩餘堂數 |
| 方案管理 | `packages:list` | 查看方案列表 |
| | `packages:create` | 新增方案範本 |
| | `packages:edit` | 編輯方案範本 |
| | `packages:delete` | 刪除方案範本 |
| QR 簽到 | `qr:generate` | 產生 QR Code |
| 月報表 | `report:view` | 查看月報表 |
| 排課管理 | `classes:view` | 查看課程月曆 |
| | `classes:create` | 新增課程 |
| | `classes:edit` | 編輯課程 |
| | `classes:delete` | 刪除課程 |
| 教練管理 | `coaches:list` | 查看教練列表 |
| | `coaches:create` | 新增教練 |
| | `coaches:edit` | 編輯教練（含重設密碼、改權限） |
| | `coaches:delete` | 刪除教練 |

---

## 踩過的坑

1. **LINE LIFF 不能加在 Messaging API channel**：LINE 改版政策，要建 LINE Login channel 才能加 LIFF
2. **Render 冷啟動**：LIFF loading 預設要是 true，冷啟動期間顯示載入畫面而非直接跳轉失敗
3. **Supabase ambiguous FK**：checkins 表有兩個 members FK，select 時要用 `member:member_id(...)` 明確指定
4. **Admin 重整失去登入狀態**：store init 時就要同步設好 axios header，不能等 restore() 非同步呼叫
5. **Vercel SPA 404**：liff 和 admin 都要各自建 `vercel.json` 加 rewrites
6. **npm 裝錯目錄**：frontend 套件要在 liff/ 或 admin/ 裡裝，不是 backend/
7. **多租戶 x-gym-id**：所有業務 API 請求都必須帶 `x-gym-id` header，前端從 URL param 讀取並存 localStorage
8. **Webhook per-gym URL**：每間健身房在 LINE Developers Console 設自己的 Webhook URL（`/webhook/<gym_id>`），後端用該館的 `line_channel_secret` 驗簽名、`line_channel_access_token` 回覆
9. **PostgreSQL 保留字 `username`**：欄位名稱 `username` 是保留字，SQL 中必須用雙引號 `"username"` 包起來
10. **SQL 中 JSON 字串換行**：手動拼接 JSON 字串若含換行符會報 invalid input syntax for type json，改用 `jsonb_build_array()` 函式避免
11. **簽到時區 bug**：server 用 UTC，`new Date().toISOString().slice(0,10)` 取到的是 UTC 日期，台灣 UTC+8 跨日時防重複簽到判斷會錯，時間範圍要用 `+08:00` 的起訖
12. **LINE 歡迎訊息沒收到**：Render 冷啟動約 30-60 秒，follow 事件觸發時 server 可能還沒醒；另需確認 LINE Console 的 Webhook URL 正確且 Use webhook 已開啟、Auto-reply 已關閉
13. **FullCalendar eventSources async + callback 不能混用**：`async function` 已回傳 Promise，不能同時呼叫 `successCallback`，FullCalendar 兩種都忽略；改成純 Promise（`return` 事件陣列）或純 callback（非 async function）
14. **FullCalendar 月視圖 info.start 是格線邊緣非當月第一天**：月視圖 `info.start` 是最左上格（可能是上個月底），`info.end` 是最右下格後一天（可能是下個月初），需迴圈產生 start 到 end 之間所有月份一起撈
15. **本地開發 CORS**：後端 CORS 只允許 Vercel 網址，本地開發需在 `vite.config.js` 設 `server.proxy` 把 `/api` 轉發到 Render，並把 `VITE_API_URL` 設為空字串讓 axios 用相對路徑
16. **LIFF init 競爭條件**：`store.init()` 若在 `onMounted` 呼叫，此時 `liff.init()` 尚未完成，`liff.getProfile()` 會報錯 → 改在 `main.js` 的 `bootstrap()` 函式裡 `await initLiff()` 之後才呼叫 `store.init()`
17. **未綁定學員卡在主頁**：router `beforeEach` 在 `store.loading = true` 時放行，`store.init()` 完成後不會重新觸發 guard → `bootstrap()` 裡 `await store.init()` 之後主動 `router.push('/' 或 '/bind')`
18. **QR token 打 API 時 auth 未就緒**：`HomePage.vue` 的 `onMounted` 早於 `bootstrap()` 的 `store.init()` 完成，帶 token 的 checkin API 此時 header 還沒設 → `onMounted` 裡先 `watch(() => store.loading, ...)` 等初始化完再送出
19. **SPA 動態換 favicon 在 Safari 不可靠**：用 JS 刪除舊 `<link rel="icon">` 再插入新節點，Chrome 正常，Safari（macOS/iOS）不會更新 tab 圖示 → 改用 Vite MPA，兩個入口各自的 HTML 直接寫死不同 favicon，根本避免動態切換
20. **iOS 17+ PWA localStorage 隔離**：主畫面捷徑（Web App 模式）的 localStorage 與 Safari 瀏覽器隔離，從 Safari 存的 gym_id 在捷徑裡讀不到 → 改用 cookie 存 gym_id（cookie 跨 Safari／Web App 共用）
21. **iOS PWA manifest start_url 覆蓋當下 URL**：Safari 加入主畫面時會用 manifest 的 `start_url` 取代當下 URL（含 query string），所以 `?gym=<id>` 會被去掉 → 用 Vercel serverless function 產生動態 manifest，router guard 偵測到 gym 時即時更新 `<link rel="manifest">` href；但最終可靠解法仍是 cookie（manifest 更新有時序問題）
22. **PWA standalone 狀態列重疊**：`viewport-fit=cover` 讓頁面延伸到 Dynamic Island / 瀏海下方，fixed header 若沒加 `padding-top: env(safe-area-inset-top)` 會與時間欄重疊
23. **LIFF 圖文選單深層連結不能用 hash**：`liff.line.me/{id}?gym=xxx#/classes` 中的 `#/classes` 是 `liff.line.me` 的 hash fragment，LIFF redirect 時不會轉發給 app，WebView 永遠開在 `/`。正確格式：`liff.line.me/{id}/classes?gym=xxx`（路徑放在 liffId 後面）
24. **LIFF init 後 URL 還原在 Vue Router 外部**：LIFF SDK 在 `init()` 完成後用 `history.pushState` 把 `/?liff.state=%2Fclasses` 還原成 `/classes`，但這個動作繞過 Vue Router，router 仍停在 `/`。解法：`await initLiff()` 之後主動 `router.push(window.location.pathname)` 讓 router 跟上還原後的路徑
25. **Render 免費方案暫停（x-render-routing: no-deploy）**：Render 免費服務被 suspend（非冷啟動）時回傳此 header，cron job 全部失敗。需到 Render Dashboard → Resume Service 或手動 Deploy 才能喚醒
26. **場地預約跨午夜時間計算**：`end - start` 結果為負（如 21:00→00:00 = -21h），要 `if (diff <= 0) diff += 24 * 60` 修正；`end_at` 的日期也要用隔天的日期，否則 start_at > end_at 導致資料庫衝突偵測失效
27. **Grid 子元素 overflow 溢出**：CSS Grid 預設子元素 `min-width: auto`，內容過長時會撐破格線。在 grid 子元素加 `min-w-0` 讓其可以縮小至 0，解決半寬輸入框在手機上重疊的問題
