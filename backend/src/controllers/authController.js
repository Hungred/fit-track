import supabase from '../lib/supabase.js'

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
