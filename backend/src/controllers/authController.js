import supabase from '../lib/supabase.js'

export async function changePassword(req, res) {
  const { current_password, new_password } = req.body
  const gym = req.gym

  if (!current_password || !new_password) {
    return res.status(400).json({ error: '請填寫目前密碼與新密碼' })
  }
  if (new_password.length < 6) {
    return res.status(400).json({ error: '新密碼至少需要 6 個字元' })
  }
  if (current_password !== gym.admin_password) {
    return res.status(401).json({ error: '目前密碼錯誤' })
  }

  const { error } = await supabase
    .from('gyms')
    .update({ admin_password: new_password })
    .eq('id', gym.id)

  if (error) return res.status(500).json({ error: error.message })

  res.json({ ok: true })
}

export async function adminLogin(req, res) {
  const { password } = req.body
  const gym = req.gym

  if (!password || password !== gym.admin_password) {
    return res.status(401).json({ error: '密碼錯誤' })
  }

  const { data: coach, error } = await supabase
    .from('members')
    .select('id, name, line_uid')
    .eq('role', 'coach')
    .eq('gym_id', gym.id)
    .single()

  if (error || !coach) {
    return res.status(404).json({ error: '找不到教練帳號，請先在 Supabase 設定 role = coach' })
  }

  res.json({ coach })
}
