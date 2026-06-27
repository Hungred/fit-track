import supabase from '../lib/supabase.js'

export async function checkin(req, res) {
  const { method = 'button', qr_token } = req.body
  const memberId = req.member.id

  // QR Code 模式需驗證 token
  if (method === 'qr') {
    const { data: token } = await supabase
      .from('qr_tokens')
      .select('*')
      .eq('token', qr_token)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (!token) return res.status(400).json({ error: 'QR Code 已失效或無效' })
  }

  // 取得有效方案（剩餘堂數 > 0，未到期，依建立時間排序先扣舊的）
  const { data: packages, error: pkgError } = await supabase
    .from('member_packages')
    .select('*')
    .eq('member_id', memberId)
    .gt('remaining_sessions', 0)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .order('created_at', { ascending: true })

  if (pkgError || !packages?.length) {
    return res.status(400).json({ error: '目前沒有有效堂數，請先購課' })
  }

  const targetPackage = packages[0]

  // 防重複簽到（同一天已簽到）
  const today = new Date().toISOString().slice(0, 10)
  const { data: existing } = await supabase
    .from('checkins')
    .select('id')
    .eq('member_id', memberId)
    .gte('checked_in_at', `${today}T00:00:00`)
    .lte('checked_in_at', `${today}T23:59:59`)
    .single()

  if (existing) return res.status(400).json({ error: '今天已經簽到過了' })

  // 建立簽到記錄
  const { data: checkin, error: checkinError } = await supabase
    .from('checkins')
    .insert({
      member_id: memberId,
      member_package_id: targetPackage.id,
      checked_in_at: new Date().toISOString(),
      method,
    })
    .select()
    .single()

  if (checkinError) return res.status(500).json({ error: checkinError.message })

  // 扣除堂數
  const { error: deductError } = await supabase
    .from('member_packages')
    .update({ remaining_sessions: targetPackage.remaining_sessions - 1 })
    .eq('id', targetPackage.id)

  if (deductError) return res.status(500).json({ error: deductError.message })

  res.json({
    message: '簽到成功！',
    checkin,
    remaining_sessions: targetPackage.remaining_sessions - 1,
    package_name: targetPackage.name,
  })
}

// 教練手動補登
export async function manualCheckin(req, res) {
  const { member_id, date, notes } = req.body

  const { data: packages } = await supabase
    .from('member_packages')
    .select('*')
    .eq('member_id', member_id)
    .gt('remaining_sessions', 0)
    .order('created_at', { ascending: true })

  if (!packages?.length) return res.status(400).json({ error: '該學員沒有有效堂數' })

  const targetPackage = packages[0]

  const { data: checkin, error } = await supabase
    .from('checkins')
    .insert({
      member_id,
      member_package_id: targetPackage.id,
      checked_in_at: date || new Date().toISOString(),
      method: 'manual',
      notes,
      created_by: req.member.id,
    })
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })

  await supabase
    .from('member_packages')
    .update({ remaining_sessions: targetPackage.remaining_sessions - 1 })
    .eq('id', targetPackage.id)

  res.json({ message: '補登成功', checkin })
}
