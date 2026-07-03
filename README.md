# Fit Track

LINE 官方帳號健身房簽到管理系統，多租戶 SaaS 架構，支援多間健身房共用同一套後端。

學員透過 LINE LIFF 簽到、查看堂數與課程；教練透過網頁後台管理出勤、方案與排課；營運方透過 Operator 後台統一管理所有健身房。

---

## 系統架構

```
fit-track/
├── backend/   Node.js + Express API，部署在 Render
├── liff/      Vue 3 學員端 LIFF，部署在 Vercel
└── admin/     Vue 3 教練後台 + 營運後台，部署在 Vercel
```

### 技術棧

| 層級 | 技術 |
|------|------|
| 後端 | Node.js、Express、Supabase（PostgreSQL） |
| 前端 | Vue 3、Vite、Tailwind CSS、Element Plus |
| 排課月曆 | FullCalendar |
| LINE 整合 | LINE LIFF SDK、Messaging API、Flex Message |
| 部署 | Render（後端）、Vercel（前端） |

---

## 功能總覽

### 學員端（LINE LIFF）
- LINE 帳號綁定（姓名、電話）
- 按鈕簽到 / QR Code 掃碼簽到
- 查看剩餘堂數與有效方案
- 出勤記錄頁
- 課程邀請清單，可直接在 LIFF 確認/請假/討論
- 圖文選單快速入口

### 教練後台（Admin）
- 帳號密碼登入，多教練帳號 + 細粒度 20 項權限管理
- 出勤總覽（今日簽到、今日請假）
- 學員管理（查看、補登、指派方案、調整堂數）
- 堂數方案管理（新增、編輯、刪除）
- QR Code 簽到產生（10 分鐘有效，自動刷新）
- 月報表（總出勤、人數、日曆熱點圖）
- 排課管理（FullCalendar 月曆／週視圖，手機版清單視圖）
- 批次新增課程，推播 LINE 邀請通知
- 教練管理（新增、設定權限、重設密碼）
- PWA 支援，可加入主畫面捷徑

### 營運後台（Operator）
- 獨立密碼登入
- 管理所有健身房（新增、編輯、停用/啟用、刪除）
- 各館 LINE 憑證（Channel Secret、Access Token、LIFF ID）集中管理
- 全平台統計（健身房數、學員數）
- 操作日誌（登入、新增、更新、刪除均記錄，含 diff）

---

## 部署資訊

| 服務 | URL |
|------|-----|
| 後端 API | https://fit-track-api-94nn.onrender.com |
| 學員 LIFF | https://fit-track-liff.vercel.app |
| 教練後台 | https://fit-track-admin.vercel.app |
| 營運後台 | https://fit-track-admin.vercel.app/operator |
| Supabase | https://vmpudqnfwnnzekplmgjd.supabase.co |

> Render 免費方案閒置 15 分鐘後冷啟動，第一次請求需等 30–60 秒。

---

## 本地開發

### 前置需求

- Node.js 18+
- Supabase 專案（或使用現有）

### 安裝

```bash
# 後端
cd backend && npm install

# 前端 LIFF
cd liff && npm install

# 前端 Admin
cd admin && npm install
```

### 環境變數

**backend/.env**
```
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPER_ADMIN_PASSWORD=
FRONTEND_URL=https://fit-track-liff.vercel.app
ADMIN_URL=https://fit-track-admin.vercel.app
PORT=3000
```

**liff/.env**
```
VITE_API_URL=https://fit-track-api-94nn.onrender.com
VITE_LIFF_ID=
```

**admin/.env**
```
VITE_API_URL=https://fit-track-api-94nn.onrender.com
```

> 本地開發時將 `VITE_API_URL` 設為空字串，並在 `vite.config.js` 設 proxy 將 `/api` 轉發到 Render，避免 CORS 問題。

### 啟動

```bash
# 後端
cd backend && npm start

# 前端 LIFF
cd liff && npm run dev

# 前端 Admin
cd admin && npm run dev
```

---

## 多租戶架構

所有業務資料表皆有 `gym_id` 欄位。每個請求透過 `x-gym-id` header 識別健身房，後端 `requireGym` middleware 驗證後注入 `req.gym`。

LINE Webhook URL 格式為 `/webhook/:gymId`，每間健身房在 LINE Developers Console 各自設定，後端以該館的 `line_channel_secret` 驗簽名。

---

## 資料庫（Supabase）

| 資料表 | 說明 |
|--------|------|
| `gyms` | 健身房主檔，含 LINE 憑證與狀態 |
| `members` | 學員與教練（`role: member / coach`） |
| `packages` | 堂數方案範本 |
| `member_packages` | 學員持有的方案與剩餘堂數 |
| `checkins` | 簽到記錄（`method: button / qr / manual`） |
| `qr_tokens` | QR Code token，掃完失效 |
| `leaves` | 請假記錄 |
| `classes` | 課程主檔 |
| `class_enrollments` | 學員出席狀態（`pending / confirmed / leave / discuss / attended`） |
| `operator_logs` | 營運後台操作日誌 |
