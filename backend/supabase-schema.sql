-- =============================================
-- Fit Track 資料庫 Schema
-- 在 Supabase SQL Editor 中執行此檔案
-- =============================================

-- 學員資料表
CREATE TABLE members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  line_uid TEXT UNIQUE NOT NULL,
  display_name TEXT,          -- LINE 顯示名稱
  name TEXT NOT NULL,         -- 真實姓名（綁定時填寫）
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'coach')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 堂數方案範本（由教練建立）
CREATE TABLE packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,          -- 例如：10堂課包、月票20堂
  total_sessions INT NOT NULL,
  price NUMERIC(10, 2),
  valid_days INT,              -- 效期天數，NULL 表示無到期限制
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 學員持有的方案（購課記錄）
CREATE TABLE member_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  package_id UUID NOT NULL REFERENCES packages(id),
  remaining_sessions INT NOT NULL,
  expires_at TIMESTAMPTZ,     -- NULL 表示永久有效
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 簽到記錄
CREATE TABLE checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  member_package_id UUID NOT NULL REFERENCES member_packages(id),
  checked_in_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  method TEXT NOT NULL DEFAULT 'button' CHECK (method IN ('button', 'qr', 'manual')),
  notes TEXT,
  created_by UUID REFERENCES members(id),  -- 補登時記錄教練 ID
  created_at TIMESTAMPTZ DEFAULT now()
);

-- QR Code Token 表（每次產生新 QR 時寫入，掃完即失效）
CREATE TABLE qr_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- 索引（加速查詢）
-- =============================================
CREATE INDEX idx_checkins_member_id ON checkins(member_id);
CREATE INDEX idx_checkins_checked_in_at ON checkins(checked_in_at);
CREATE INDEX idx_member_packages_member_id ON member_packages(member_id);
CREATE INDEX idx_members_line_uid ON members(line_uid);

-- =============================================
-- RLS（Row Level Security）
-- 後端使用 service_role key，可繞過 RLS
-- 若前端直接連 Supabase，需設定下列政策
-- =============================================
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_tokens ENABLE ROW LEVEL SECURITY;
