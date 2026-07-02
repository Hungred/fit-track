import bcrypt from 'bcrypt'
import supabase from '../lib/supabase.js'
import { ALL_PERMISSIONS } from '../lib/permissions.js'

const SENSITIVE_FIELDS = new Set(['admin_password', 'line_channel_secret', 'line_channel_access_token'])
const FIELD_LABELS = {
  name: '健身房名稱',
  admin_password: '後台密碼',
  line_channel_secret: 'LINE Channel Secret',
  line_channel_access_token: 'LINE Channel Access Token',
  liff_id: 'LIFF ID',
  status: '狀態',
}
const STATUS_LABELS = { active: '營運中', suspended: '已停用' }

async function logAction(action, gymId, gymName, detail = {}) {
  await supabase.from('operator_logs').insert({
    action,
    gym_id: gymId || null,
    gym_name: gymName || null,
    detail,
  })
}

export async function listGyms(req, res) {
  const { data: gyms, error } = await supabase
    .from('gyms')
    .select('id, name, liff_id, line_channel_secret, line_channel_access_token, admin_password, status, created_at')
    .order('created_at', { ascending: false })

  if (error) return res.status(500).json({ error: error.message })

  const result = await Promise.all(gyms.map(async (gym) => {
    const { count: memberCount } = await supabase
      .from('members').select('id', { count: 'exact', head: true }).eq('gym_id', gym.id).eq('role', 'member')
    return { ...gym, member_count: memberCount || 0 }
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

  const coach_password = await bcrypt.hash(admin_password, 10)
  await supabase.from('members').insert({
    name: '教練',
    phone: '',
    line_uid: `coach_${data.id}`,
    username: 'admin',
    coach_password,
    permissions: ALL_PERMISSIONS,
    is_owner: true,
    role: 'coach',
    gym_id: data.id,
  })

  await logAction('gym_create', data.id, data.name, {
    has_line_config: !!(line_channel_secret || line_channel_access_token),
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

  const { data: current } = await supabase.from('gyms').select('*').eq('id', id).single()
  if (!current) return res.status(404).json({ error: '找不到此健身房' })

  const { data, error } = await supabase
    .from('gyms')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })

  const changed = Object.keys(updates)
    .filter(k => updates[k] !== current[k])
    .map(k => {
      if (SENSITIVE_FIELDS.has(k)) return { field: FIELD_LABELS[k] || k, changed: true }
      const before = k === 'status' ? (STATUS_LABELS[current[k]] || current[k]) : (current[k] ?? '')
      const after = k === 'status' ? (STATUS_LABELS[updates[k]] || updates[k]) : (updates[k] ?? '')
      return { field: FIELD_LABELS[k] || k, before, after }
    })

  if (changed.length) await logAction('gym_update', id, current.name, { changed })

  res.json({ gym: data })
}

export async function deleteGym(req, res) {
  const { id } = req.params

  const { data: gym } = await supabase.from('gyms').select('name').eq('id', id).single()

  const { count } = await supabase
    .from('members')
    .select('id', { count: 'exact', head: true })
    .eq('gym_id', id)

  if (count > 0) return res.status(400).json({ error: `此健身房尚有 ${count} 位學員，無法刪除。請先停用。` })

  const { error } = await supabase.from('gyms').delete().eq('id', id)
  if (error) return res.status(500).json({ error: error.message })

  await logAction('gym_delete', null, gym?.name)
  res.json({ ok: true })
}

export async function operatorLogin(req, res) {
  const { password } = req.body
  if (!password || password !== process.env.SUPER_ADMIN_PASSWORD) {
    return res.status(401).json({ error: '密碼錯誤' })
  }
  await logAction('login', null, null)
  res.json({ ok: true })
}

export async function listLogs(req, res) {
  const { limit = 50, offset = 0, gym_id } = req.query

  let query = supabase
    .from('operator_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .range(Number(offset), Number(offset) + Number(limit) - 1)

  if (gym_id) query = query.eq('gym_id', gym_id)

  const { data: logs, error } = await query
  if (error) return res.status(500).json({ error: error.message })
  res.json({ logs })
}
