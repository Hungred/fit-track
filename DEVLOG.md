# Fit Track 開發日誌

LINE 官方帳號健身房管理系統（多租戶 SaaS）的完整開發紀錄。

> 🤖 每次 push 到 main 分支後自動補入 commit，每天 18:00 由 GitHub Actions 整理當日紀錄。

---

## 近期更新

<!-- LOG_START -->
<!-- LOG_END -->

---

## 開發歷程

### Phase 1 — MVP 核心

- LINE LIFF 學員綁定（姓名、電話）
- 學員簽到（按鈕），自動扣堂，防當天重複簽到
- 學員出勤記錄頁
- 教練後台密碼登入，登入狀態保持
- 出勤總覽（今日已簽到標示）
- 堂數方案管理（新增、編輯、刪除，刪除前檢查是否有學員使用）
- 指派方案給學員
- 學員詳細頁（方案列表、出勤記錄、手動調整堂數）
- 教練手動補登功能

---

### Phase 2 — 通知與報表

- 堂數不足（≤ 2 堂）自動推播 LINE Flex Message
- QR Code 簽到（教練後台產生，10 分鐘有效，自動刷新）
- 月報表統計（總出勤次數、出勤人數、學員明細、簽到方式分布）
- 請假功能（學員 LIFF 請假／取消；教練後台今日請假統計與標記）
- LINE 新學員歡迎訊息（follow 事件觸發 Flex Message，含功能說明與立即綁定按鈕）
- 教練變更自己的登入密碼（Admin 側欄底部）

---

### Phase 3 — 多租戶 & 多教練

- 多租戶架構：Operator 後台管理多間健身房，LINE 憑證 per-gym 存 DB
- 營運後台統計：健身房總數、營運中數量、平台總學員數
- 多教練帳號 + 細粒度 20 項權限管理（username / bcrypt 密碼 / permissions JSONB / is_owner）

---

### Phase 4 — 排課系統

- 排課系統：FullCalendar 月曆 + 週視圖，事件顏色依確認狀態區分（灰 / 橘 / 綠）
- 批次新增課程（一次填多時段、送出前預覽、推播 LINE 邀請）
- LINE Flex Message 課程邀請、postback 確認 / 請假 / 討論、iCal 匯出
- LIFF 課程清單頁（學員查看邀請與狀態，可直接在 LIFF 更改）
- 課程報名互動狀態機（pending → confirmed / leave / discuss → attended）
- 打卡自動出席：簽到成功時自動將前後 2 小時課程 enrollment 更新為 attended
- 課程開始前 1 小時推播提醒（Supabase Edge Function + pg_cron，每 5 分鐘觸發，不依賴 Render）
- LINE 按鈕重複點擊防護
- Admin 課程詳情：教練可用下拉選單直接修改學員出席狀態

---

### Phase 5 — RWD、PWA、圖文選單

- LIFF 圖文選單（4 格）：立即簽到、我的堂數、出勤記錄、我的課程
- Admin RWD（平板 / 手機版，漢堡選單 + 抽屜側欄；Table 改手機卡片）
- PWA 支援：健身房後台 / 營運後台各自獨立 icon 與 manifest；iOS cookie 持久化 gym_id

---

### Phase 6 — 場地租借 & 請假頁

- 場地租借系統：`spaces` + `space_bookings` 資料表
  - Admin 後台 SpacesPage（場地 CRUD）、SpaceBookingsPage（預約管理、確認推播 LINE）
  - ClassesPage 月曆整合場地預約（紫色事件）
  - LIFF `/space-booking` 4 步驟預約流程，支援未綁定學員
- LIFF `/leave` 獨立請假申請頁（橘色主題，含請假表單、歷史記錄、取消功能）
- LINE 圖文選單更新為 2×3（6 格）：簽到、堂數、租借場地、出勤記錄、課程、請假

---

### Phase 7 — 團課 & 圖文選單重構 & 方案分類

- 團課管理系統：4 張資料表（group_classes / group_class_terms / sessions / enrollments）
  - Admin 後台三欄操作（團課 → 期別 → 報名名單），開新期自動產生 sessions，付款狀態標記
  - LIFF `/group-classes` 學員瀏覽報名頁，支援未綁定學員
- LINE 圖文選單重構為 5 格非對稱版型（左 2 行 × 中 2 行 + 右全高）
  - 場地租借、不定期團課、體驗課（暫停用）、私人課程（暫停用）、場地介紹（暫停用）
  - 透過 LINE Messaging API 自訂 area 座標；`backend/scripts/setup-richmenu.js`
- 方案管理分類：`packages` 表新增 `category` 欄位（`general` 私人教練課 / `massage` 運動按摩 / `boxing` 拳擊課）
  - Admin PackagesPage 4 Tab 篩選（全部 / 私人教練課 / 運動按摩 / 拳擊課）
  - 方案卡片顯示分類 badge（藍 / 紫 / 紅）
