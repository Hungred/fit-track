import supabase from '../lib/supabase.js'
import { pushMessage, checkinSuccessMessage, lowSessionMessage } from '../lib/line.js'

export async function checkin(req, res) {
  const { method = 'button', qr_token } = req.body
  const memberId = req.member.id
  const gymId = req.gym.id

  if (method === 'qr') {
    const { data: token } = await supabase
      .from('qr_tokens')
      .select('*')
      .eq('token', qr_token)
      .eq('gym_id', gymId)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (!token) return res.status(400).json({ error: 'QR Code 已失效或無效' })
  }

  const { data: packages, error: pkgError } = await supabase
    .from('member_packages')
    .select('*')
    .eq('member_id', memberId)
    .eq('gym_id', gymId)
    .gt('remaining_sessions', 0)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .order('created_at', { ascending: true })

  if (pkgError || !packages?.length) {
    return res.status(400).json({ error: '目前沒有有效堂數，請先購課' })
  }

  const targetPackage = packages[0]

  const today = new Date().toISOString().slice(0, 10)
  const { data: existing } = await supabase
    .from('checkins')
    .select('id')
    .eq('member_id', memberId)
    .eq('gym_id', gymId)
    .gte('checked_in_at', `${today}T00:00:00`)
    .lte('checked_in_at', `${today}T23:59:59`)
    .single()

  if (existing) return res.status(400).json({ error: '今天已經簽到過了' })

  const { data: checkin, error: checkinError } = await supabase
    .from('checkins')
    .insert({
      member_id: memberId,
      member_package_id: targetPackage.id,
      checked_in_at: new Date().toISOString(),
      method,
      gym_id: gymId,
    })
    .select()
    .single()

  if (checkinError) return res.status(500).json({ error: checkinError.message })

  const remaining = targetPackage.remaining_sessions - 1

  const { error: deductError } = await supabase
    .from('member_packages')
    .update({ remaining_sessions: remaining })
    .eq('id', targetPackage.id)

  if (deductError) return res.status(500).json({ error: deductError.message })

  const { data: memberData } = await supabase
    .from('members')
    .select('name, line_uid')
    .eq('id', memberId)
    .single()

  const { data: pkgData } = await supabase
    .from('packages')
    .select('name')
    .eq('id', targetPackage.package_id)
    .single()

  const lineToken = req.gym.line_channel_access_token

  if (memberData?.line_uid) {
    const pkgName = pkgData?.name || '課程方案'
    pushMessage(memberData.line_uid, checkinSuccessMessage(memberData.name, remaining, pkgName, checkin.checked_in_at), lineToken).catch(() => {})
    if (remaining <= 2) {
      pushMessage(memberData.line_uid, lowSessionMessage(memberData.name, remaining, pkgName), lineToken).catch(() => {})
    }
  }

  res.json({ message: '簽到成功！', checkin, remaining_sessions: remaining, package_name: targetPackage.name })
}

export async function manualCheckin(req, res) {
  const { member_id, date, notes } = req.body
  const gymId = req.gym.id

  const { data: packages } = await supabase
    .from('member_packages')
    .select('*')
    .eq('member_id', member_id)
    .eq('gym_id', gymId)
    .gt('remaining_sessions', 0)
    .order('created_at', { ascending: true })

  if (!packages?.length) return res.status(400).json({ error: '該學員沒有有效堂數' })

  const targetPackage = packages[0]
  const remaining = targetPackage.remaining_sessions - 1

  const { data: checkin, error } = await supabase
    .from('checkins')
    .insert({
      member_id,
      member_package_id: targetPackage.id,
      checked_in_at: date || new Date().toISOString(),
      method: 'manual',
      notes,
      created_by: req.member.id,
      gym_id: gymId,
    })
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })

  await supabase.from('member_packages').update({ remaining_sessions: remaining }).eq('id', targetPackage.id)

  if (remaining <= 2) {
    const { data: memberData } = await supabase.from('members').select('name, line_uid').eq('id', member_id).single()
    const { data: pkgData } = await supabase.from('packages').select('name').eq('id', targetPackage.package_id).single()
    if (memberData?.line_uid) {
      pushMessage(memberData.line_uid, lowSessionMessage(memberData.name, remaining, pkgData?.name || '課程方案'), req.gym.line_channel_access_token).catch(() => {})
    }
  }

  res.json({ message: '補登成功', checkin })
}
