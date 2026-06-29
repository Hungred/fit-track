import bcrypt from 'bcrypt'
import supabase from '../lib/supabase.js'

export async function adminLogin(req, res) {
  const { username, password } = req.body
  const gym = req.gym

  if (!username || !password) {
    return res.status(400).json({ error: '請填寫帳號與密碼' })
  }

  const { data: coach, error } = await supabase
    .from('members')
    .select('id, name, line_uid, username, coach_password, permissions, is_owner')
    .eq('gym_id', gym.id)
    .eq('role', 'coach')
    .eq('username', username)
    .single()

  if (error || !coach) {
    return res.status(401).json({ error: '帳號或密碼錯誤' })
  }

  // 若 coach_password 尚未設定（舊帳號遷移），fallback 比對 gym.admin_password
  let valid = false
  if (coach.coach_password) {
    valid = await bcrypt.compare(password, coach.coach_password)
  } else {
    valid = password === gym.admin_password
  }

  if (!valid) {
    return res.status(401).json({ error: '帳號或密碼錯誤' })
  }

  res.json({ coach })
}

export async function changePassword(req, res) {
  const { current_password, new_password } = req.body
  const gym = req.gym
  const coach = req.member

  if (!current_password || !new_password) {
    return res.status(400).json({ error: '請填寫目前密碼與新密碼' })
  }
  if (new_password.length < 6) {
    return res.status(400).json({ error: '新密碼至少需要 6 個字元' })
  }

  let valid = false
  if (coach.coach_password) {
    valid = await bcrypt.compare(current_password, coach.coach_password)
  } else {
    valid = current_password === gym.admin_password
  }

  if (!valid) {
    return res.status(401).json({ error: '目前密碼錯誤' })
  }

  const hashed = await bcrypt.hash(new_password, 10)

  const { error } = await supabase
    .from('members')
    .update({ coach_password: hashed })
    .eq('id', coach.id)

  if (error) return res.status(500).json({ error: error.message })

  res.json({ ok: true })
}
