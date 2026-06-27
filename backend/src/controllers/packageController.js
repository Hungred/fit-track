import supabase from '../lib/supabase.js'

// 取得所有方案範本（教練設定）
export async function listPackageTemplates(req, res) {
  const { data, error } = await supabase
    .from('packages')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return res.status(500).json({ error: error.message })
  res.json({ packages: data })
}

export async function createPackageTemplate(req, res) {
  const { name, total_sessions, price, valid_days } = req.body

  const { data, error } = await supabase
    .from('packages')
    .insert({ name, total_sessions, price, valid_days })
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.json({ package: data })
}

// 指派方案給學員
export async function assignPackage(req, res) {
  const { member_id, package_id, expires_at } = req.body

  const { data: pkg } = await supabase
    .from('packages')
    .select('*')
    .eq('id', package_id)
    .single()

  if (!pkg) return res.status(404).json({ error: '方案不存在' })

  const expiresAt = expires_at || (pkg.valid_days
    ? new Date(Date.now() + pkg.valid_days * 86400000).toISOString()
    : null)

  const { data, error } = await supabase
    .from('member_packages')
    .insert({
      member_id,
      package_id,
      remaining_sessions: pkg.total_sessions,
      expires_at: expiresAt,
    })
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.json({ member_package: data })
}

// 手動調整堂數
export async function adjustSessions(req, res) {
  const { id } = req.params
  const { delta, notes } = req.body

  const { data: mp } = await supabase
    .from('member_packages')
    .select('remaining_sessions')
    .eq('id', id)
    .single()

  if (!mp) return res.status(404).json({ error: '方案不存在' })

  const newCount = Math.max(0, mp.remaining_sessions + delta)

  const { data, error } = await supabase
    .from('member_packages')
    .update({ remaining_sessions: newCount, notes })
    .eq('id', id)
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.json({ member_package: data })
}
