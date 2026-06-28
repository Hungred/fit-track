import supabase from '../lib/supabase.js'

export async function listGyms(req, res) {
  const { data: gyms, error } = await supabase
    .from('gyms')
    .select('id, name, liff_id, line_channel_secret, line_channel_access_token, admin_password, status, created_at')
    .order('created_at', { ascending: false })

  if (error) return res.status(500).json({ error: error.message })

  // 補上各館學員數與本月出勤數
  const today = new Date()
  const monthStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`

  const result = await Promise.all(gyms.map(async (gym) => {
    const [{ count: memberCount }, { count: checkinCount }] = await Promise.all([
      supabase.from('members').select('id', { count: 'exact', head: true }).eq('gym_id', gym.id).eq('role', 'member'),
      supabase.from('checkins').select('id', { count: 'exact', head: true }).eq('gym_id', gym.id).gte('checked_in_at', monthStart),
    ])
    return { ...gym, member_count: memberCount || 0, month_checkins: checkinCount || 0 }
  }))

  res.json({ gyms: result })
}

export async function getGym(req, res) {
  const { id } = req.params
  const { data: gym, error } = await supabase
    .from('gyms')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !gym) return res.status(404).json({ error: '找不到此健身房' })
  res.json({ gym })
}

export async function createGym(req, res) {
  const { name, line_channel_secret, line_channel_access_token, liff_id, admin_password } = req.body
  if (!name || !admin_password) return res.status(400).json({ error: '名稱與後台密碼為必填' })

  const { data, error } = await supabase
    .from('gyms')
    .insert({ name, line_channel_secret, line_channel_access_token, liff_id, admin_password })
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })

  await supabase.from('members').insert({
    name: '教練',
    phone: '',
    line_uid: `coach_${data.id}`,
    role: 'coach',
    gym_id: data.id,
  })

  res.json({ gym: data })
}

export async function updateGym(req, res) {
  const { id } = req.params
  const { name, line_channel_secret, line_channel_access_token, liff_id, admin_password, status } = req.body

  const updates = {}
  if (name !== undefined) updates.name = name
  if (line_channel_secret !== undefined) updates.line_channel_secret = line_channel_secret
  if (line_channel_access_token !== undefined) updates.line_channel_access_token = line_channel_access_token
  if (liff_id !== undefined) updates.liff_id = liff_id
  if (admin_password !== undefined) updates.admin_password = admin_password
  if (status !== undefined) updates.status = status

  const { data, error } = await supabase
    .from('gyms')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.json({ gym: data })
}

export async function deleteGym(req, res) {
  const { id } = req.params

  const { count } = await supabase
    .from('members')
    .select('id', { count: 'exact', head: true })
    .eq('gym_id', id)

  if (count > 0) return res.status(400).json({ error: `此健身房尚有 ${count} 位學員，無法刪除。請先停用。` })

  const { error } = await supabase.from('gyms').delete().eq('id', id)
  if (error) return res.status(500).json({ error: error.message })
  res.json({ ok: true })
}

export async function operatorLogin(req, res) {
  const { password } = req.body
  if (!password || password !== process.env.SUPER_ADMIN_PASSWORD) {
    return res.status(401).json({ error: '密碼錯誤' })
  }
  res.json({ ok: true })
}
