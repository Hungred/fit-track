import bcrypt from 'bcrypt'
import { randomUUID, randomBytes } from 'crypto'
import supabase from '../lib/supabase.js'
import { ALL_PERMISSIONS } from '../lib/permissions.js'

export async function listCoaches(req, res) {
  const { data, error } = await supabase
    .from('members')
    .select('id, name, username, line_uid, permissions, is_owner, created_at')
    .eq('gym_id', req.gym.id)
    .eq('role', 'coach')
    .order('created_at')

  if (error) return res.status(500).json({ error: error.message })
  res.json({ coaches: data })
}

export async function createCoach(req, res) {
  const { name, username, password, permissions } = req.body

  if (!name || !username || !password) {
    return res.status(400).json({ error: '姓名、帳號、密碼為必填' })
  }
  if (password.length < 6) {
    return res.status(400).json({ error: '密碼至少需要 6 個字元' })
  }

  const validPerms = (permissions || []).filter(p => ALL_PERMISSIONS.includes(p))
  const coach_password = await bcrypt.hash(password, 10)

  const { data, error } = await supabase
    .from('members')
    .insert({
      name,
      username,
      coach_password,
      permissions: validPerms,
      is_owner: false,
      role: 'coach',
      gym_id: req.gym.id,
      line_uid: `coach_${randomUUID()}`,
      phone: '',
    })
    .select('id, name, username, permissions, is_owner, created_at')
    .single()

  if (error) {
    if (error.code === '23505') return res.status(400).json({ error: '此帳號名稱已存在' })
    return res.status(500).json({ error: error.message })
  }

  res.json({ coach: data })
}

export async function updateCoach(req, res) {
  const { id } = req.params
  const { name, username, new_password, permissions, line_uid } = req.body

  const { data: existing } = await supabase
    .from('members')
    .select('id, is_owner')
    .eq('id', id)
    .eq('gym_id', req.gym.id)
    .eq('role', 'coach')
    .single()

  if (!existing) return res.status(404).json({ error: '找不到此教練' })

  const updates = {}
  if (name) updates.name = name
  if (username) updates.username = username
  if (new_password) {
    if (new_password.length < 6) return res.status(400).json({ error: '密碼至少需要 6 個字元' })
    updates.coach_password = await bcrypt.hash(new_password, 10)
  }
  if (permissions !== undefined) {
    updates.permissions = permissions.filter(p => ALL_PERMISSIONS.includes(p))
  }
  if (line_uid !== undefined) {
    if (line_uid && !/^U[0-9a-f]{32}$/.test(line_uid)) {
      return res.status(400).json({ error: 'LINE UID 格式錯誤（應以 U 開頭，共 33 個字元）' })
    }
    updates.line_uid = line_uid || `coach_${randomUUID()}`
  }

  const { data, error } = await supabase
    .from('members')
    .update(updates)
    .eq('id', id)
    .select('id, name, username, line_uid, permissions, is_owner, created_at')
    .single()

  if (error) {
    if (error.code === '23505') return res.status(400).json({ error: '此帳號名稱已存在' })
    return res.status(500).json({ error: error.message })
  }

  res.json({ coach: data })
}

export async function generateBindToken(req, res) {
  const { id } = req.params

  const { data: coach } = await supabase
    .from('members')
    .select('id')
    .eq('id', id)
    .eq('gym_id', req.gym.id)
    .eq('role', 'coach')
    .single()

  if (!coach) return res.status(404).json({ error: '找不到此教練' })

  const token = randomBytes(20).toString('hex')
  const expires_at = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

  await supabase.from('coach_bind_tokens').delete().eq('coach_id', id)

  const { error } = await supabase.from('coach_bind_tokens').insert({
    token,
    coach_id: id,
    gym_id: req.gym.id,
    expires_at,
  })

  if (error) return res.status(500).json({ error: error.message })

  const liffId = req.gym.liff_id
  const url = liffId
    ? `https://liff.line.me/${liffId}/coach-bind?token=${token}&gym=${req.gym.id}`
    : null

  res.json({ token, url, expires_at })
}

export async function useBindToken(req, res) {
  const { token, line_uid } = req.body

  if (!token || !line_uid) return res.status(400).json({ error: '缺少 token 或 line_uid' })
  if (!/^U[0-9a-f]{32}$/.test(line_uid)) return res.status(400).json({ error: 'LINE UID 格式錯誤' })

  const { data: record } = await supabase
    .from('coach_bind_tokens')
    .select('*')
    .eq('token', token)
    .eq('gym_id', req.gym.id)
    .single()

  if (!record) return res.status(404).json({ error: '無效的綁定連結' })
  if (new Date(record.expires_at) < new Date()) return res.status(410).json({ error: '連結已過期，請請管理員重新產生' })

  const { error } = await supabase
    .from('members')
    .update({ line_uid })
    .eq('id', record.coach_id)
    .eq('gym_id', req.gym.id)

  if (error) return res.status(500).json({ error: error.message })

  await supabase.from('coach_bind_tokens').delete().eq('token', token)

  res.json({ ok: true })
}

export async function deleteCoach(req, res) {
  const { id } = req.params

  if (req.member.id === id) {
    return res.status(400).json({ error: '無法刪除自己的帳號' })
  }

  const { data: target } = await supabase
    .from('members')
    .select('id, is_owner')
    .eq('id', id)
    .eq('gym_id', req.gym.id)
    .eq('role', 'coach')
    .single()

  if (!target) return res.status(404).json({ error: '找不到此教練' })
  if (target.is_owner) return res.status(400).json({ error: '無法刪除主教練帳號' })

  const { error } = await supabase.from('members').delete().eq('id', id)
  if (error) return res.status(500).json({ error: error.message })

  res.json({ ok: true })
}
