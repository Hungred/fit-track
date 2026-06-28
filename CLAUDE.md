# Fit Track — Claude 專案說明

LINE 官方帳號健身房簽到管理系統。學員透過 LINE LIFF 簽到，教練透過網頁後台管理出勤與堂數方案。

---

## 專案架構

```
fit-track/
├── backend/     Node.js + Express，部署在 Render
├── liff/        Vue 3 學員端 LIFF，部署在 Vercel
└── admin/       Vue 3 教練後台，部署在 Vercel
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
- **LINE LIFF ID**：2010531115-c2Psq9el（建立在 LINE Login channel，非 Messaging API channel）
- **GitHub**：git@github.com:Hungred/fit-track.git

---

## 環境變數

### backend/.env
```
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
LINE_CHANNEL_SECRET=
LINE_CHANNEL_ACCESS_TOKEN=
ADMIN_PASSWORD=
FRONTEND_URL=https://fit-track-liff.vercel.app
ADMIN_URL=https://fit-track-admin.vercel.app
LIFF_URL=https://fit-track-liff.vercel.app
```

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

5 張資料表，後端使用 `service_role` key 繞過 RLS：

| 資料表 | 說明 |
|--------|------|
| `members` | 學員與教練，`role` 欄位區分（`member` / `coach`） |
| `packages` | 堂數方案範本，教練建立 |
| `member_packages` | 學員持有的方案，含剩餘堂數 |
| `checkins` | 簽到記錄，`method` = `button` / `qr` / `manual` |
| `qr_tokens` | QR Code token，掃完失效 |

**重要**：`checkins` 有兩個 FK 指向 `members`（`member_id` 和 `created_by`），Supabase join 時必須用明確的 FK 欄位名稱，否則報錯：
```js
// 正確
.select('*, member:member_id(name), member_package:member_package_id(package:package_id(name))')
// 錯誤（ambiguous）
.select('*, member:members(name)')
```

後來新增的欄位（需手動在 Supabase SQL Editor 執行）：
```sql
ALTER TABLE packages ADD COLUMN price_per_session NUMERIC(10, 2), ADD COLUMN price_total NUMERIC(10, 2);
```

教練帳號設定：在 Supabase `members` 表中，將教練那筆資料的 `role` 改為 `coach`。

---

## 後端路由結構

```
POST   /api/auth/login              密碼登入，回傳 coach line_uid
GET    /api/members/me              取得學員資料 + 方案（需 x-line-uid header）
POST   /api/members/bind            綁定學員（姓名、電話）
GET    /api/members/checkins        學員出勤記錄
POST   /api/checkin                 學員簽到（自動扣堂）
POST   /api/checkin/manual          教練手動補登
GET    /api/coach/dashboard         出勤總覽（需 x-line-uid header，須為 coach）
GET    /api/coach/checkins          所有出勤記錄
GET    /api/coach/packages          方案列表
POST   /api/coach/packages          新增方案
PUT    /api/coach/packages/:id      編輯方案
DELETE /api/coach/packages/:id      刪除方案（有學員使用中則擋）
POST   /api/coach/assign-package    指派方案給學員
POST   /api/coach/adjust-sessions   調整學員堂數
POST   /webhook                     LINE Webhook
```

認證方式：
- 學員端：`x-line-uid` header（LIFF 取得後帶入）
- 教練後台：同樣用 `x-line-uid`，middleware 驗證 `role = coach`

---

## 前端說明

### LIFF（學員端）
- `stores/user.js`：`loading` 預設 `true`，避免 LIFF init 完成前 router guard 就跳轉
- `App.vue`：先判斷 `initError` → `loading` → 才渲染 `RouterView`，解決 Render 冷啟動問題
- `vercel.json`：SPA routing 需要 rewrites，否則重新整理會 404

### Admin（教練後台）
- `stores/auth.js`：store 建立時立刻從 `localStorage` 讀 UID 並設好 axios header，避免頁面重整後 onMounted 打 API 時 header 還沒設好
- 登入方式：密碼（`ADMIN_PASSWORD` env var），不需要輸入 LINE UID

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

## 待完成功能

- [x] QR Code 簽到（教練後台產生，10 分鐘有效，自動刷新）
- [x] 月報表統計（總出勤次數、出勤人數、學員明細、簽到方式分布）
- [x] 請假功能（學員 LIFF 請假/取消、教練後台今日請假統計與標記）

---

## 踩過的坑

1. **LINE LIFF 不能加在 Messaging API channel**：LINE 改版政策，要建 LINE Login channel 才能加 LIFF
2. **Render 冷啟動**：LIFF loading 預設要是 true，冷啟動期間顯示載入畫面而非直接跳轉失敗
3. **Supabase ambiguous FK**：checkins 表有兩個 members FK，select 時要用 `member:member_id(...)` 明確指定
4. **Admin 重整失去登入狀態**：store init 時就要同步設好 axios header，不能等 restore() 非同步呼叫
5. **Vercel SPA 404**：liff 和 admin 都要各自建 `vercel.json` 加 rewrites
6. **npm 裝錯目錄**：frontend 套件要在 liff/ 或 admin/ 裡裝，不是 backend/
