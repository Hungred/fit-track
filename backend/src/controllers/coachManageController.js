import bcrypt from 'bcrypt'
import { randomUUID } from 'crypto'
import supabase from '../lib/supabase.js'
import { ALL_PERMISSIONS } from '../lib/permissions.js'

export async function listCoaches(req, res) {
  const { data, error } = await supabase
    .from('members')
    .select('id, name, username, permissions, is_owner, created_at')
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
  const { name, username, new_password, permissions } = req.body

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

  const { data, error } = await supabase
    .from('members')
    .update(updates)
    .eq('id', id)
    .select('id, name, username, permissions, is_owner, created_at')
    .single()

  if (error) {
    if (error.code === '23505') return res.status(400).json({ error: '此帳號名稱已存在' })
    return res.status(500).json({ error: error.message })
  }

  res.json({ coach: data })
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
