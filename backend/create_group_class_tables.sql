-- create_group_class_tables.sql
-- 補建團課功能所需的 4 張表（group_classes / group_class_terms / group_class_sessions / group_class_enrollments）
-- 程式碼與 CLAUDE.md 都已假設這些表存在，但 production Supabase 專案裡實際從未建立。
-- 請在 Supabase SQL Editor 執行一次。

CREATE TABLE group_classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id uuid NOT NULL REFERENCES gyms(id),
  coach_id uuid REFERENCES members(id),
  name text NOT NULL,
  description text,
  day_of_week integer,
  start_time time,
  duration_minutes integer DEFAULT 60,
  price_per_term numeric DEFAULT 0,
  price_per_session numeric DEFAULT 0,
  sessions_per_term integer DEFAULT 8,
  max_students integer,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE group_class_terms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id uuid NOT NULL REFERENCES gyms(id),
  group_class_id uuid NOT NULL REFERENCES group_classes(id) ON DELETE CASCADE,
  term_number integer NOT NULL,
  start_date date NOT NULL,
  end_date date,
  status text DEFAULT 'open',
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE group_class_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id uuid NOT NULL REFERENCES gyms(id),
  term_id uuid NOT NULL REFERENCES group_class_terms(id) ON DELETE CASCADE,
  session_number integer NOT NULL,
  scheduled_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE group_class_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id uuid NOT NULL REFERENCES gyms(id),
  term_id uuid NOT NULL REFERENCES group_class_terms(id) ON DELETE CASCADE,
  member_id uuid REFERENCES members(id),
  renter_name text,
  renter_phone text,
  renter_line_uid text,
  payment_status text DEFAULT 'unpaid',
  notes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE (term_id, member_id)
);

CREATE INDEX idx_group_classes_gym_id ON group_classes(gym_id);
CREATE INDEX idx_group_class_terms_group_class_id ON group_class_terms(group_class_id);
CREATE INDEX idx_group_class_sessions_term_id ON group_class_sessions(term_id);
CREATE INDEX idx_group_class_enrollments_term_id ON group_class_enrollments(term_id);
