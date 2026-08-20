-- create_trial_class_requests_table.sql
-- 體驗課申請表單用的資料表，請在 Supabase SQL Editor 執行一次。

CREATE TABLE trial_class_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id uuid NOT NULL REFERENCES gyms(id),
  name text NOT NULL,
  phone text NOT NULL,
  contact_info text NOT NULL,
  contact_time_slots text[] NOT NULL,
  coach_gender_preference text NOT NULL,
  trial_time_slots text[] NOT NULL,
  notes text,
  line_uid text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_trial_class_requests_gym_id ON trial_class_requests(gym_id);
