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
FRONTEND_URL=https://fit-track-liff.vercel.app
ADMIN_URL=https://fit-track-admin.vercel.app
PORT=3000
```

> LINE_CHANNEL_SECRET / LINE_CHANNEL_ACCESS_TOKEN / LIFF_ID 已移至 Supabase `gyms` 表，不再放 env

### liff/.env
```
VITE_API_URL=https://fit-track-api-94nn.onrender.com
```

> `VITE_LIFF_ID` 已移除，LIFF ID 改由後端從 gyms 表讀取，或在 LIFF 初始化時從 URL param 帶入

### admin/.env
```
VITE_API_URL=https://fit-track-api-94nn.onrender.com
```

> 實際值在 Render Dashboard / Vercel Dashboard 的 Environment Variables 裡查

---

## 資料庫（Supabase）

7 張資料表，後端使用 `service_role` key 繞過 RLS。**所有業務資料表都有 `gym_id` 欄位**做多租戶隔離。

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
| `class_enrollments` | 學員出席記錄，`status` = `pending` / `confirmed` / `leave` / `discuss`，`(class_id, member_id)` 唯一鍵 |

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
POST   /api/coach/classes               新增課程並推播 LINE 邀請
GET    /api/coach/classes/:id           課程詳細（含出席狀態）
PATCH  /api/coach/classes/:id           編輯課程
DELETE /api/coach/classes/:id           刪除課程

# 公開路由（不需認證）
GET    /api/classes/:id/ical            下載課程 iCal 檔案
```

---

## 前端說明

### LIFF（學員端）
- 入口 URL 帶 `?gym=<gym_id>`，store 讀取後存 localStorage 並設 `x-gym-id` header
- `stores/user.js`：`loading` 預設 `true`，避免 LIFF init 完成前 router guard 就跳轉
- `App.vue`：先判斷 `initError` → `loading` → 才渲染 `RouterView`，解決 Render 冷啟動問題
- `vercel.json`：SPA routing 需要 rewrites，否則重新整理會 404
- API 模組：`memberApi`、`checkinApi`、`leaveApi`

### Admin（教練後台）
- 入口 URL 帶 `?gym=<gym_id>` 設定健身房，router guard 讀取並存 localStorage
- `stores/auth.js`：store 建立時立刻從 `localStorage` 讀 `coach_uid` 和 `gym_id`，並同步設好 axios header
- 登入方式：密碼（存在 `gyms` 表的 `admin_password`），不需要輸入 LINE UID
- 路由：`/login`、`/`（dashboard）、`/members`、`/members/:id`、`/packages`、`/qr`、`/report`、`/classes`、`/coaches`
- 側欄依 `permissions` 動態顯示；`is_owner` 才看得到「教練管理」
- `stores/auth.js` 登入後存 `permissions`（JSONB array）與 `is_owner` 至 localStorage
- **Operator 後台**（路由不受教練 auth guard 控制）：
  - `/operator/login`：營運方密碼登入（`localStorage` 存 `operator_password`）
  - `/operator`：管理所有健身房的 CRUD、停用/啟用、複製後台連結

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
- [x] 排課系統（FullCalendar 月曆、LINE Flex Message 課程邀請、postback 確認/請假/討論、iCal 匯出、LIFF 課程清單）

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
