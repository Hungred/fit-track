import crypto from 'crypto'
import supabase from '../lib/supabase.js'

export async function getDashboard(req, res) {
  const today = new Date().toISOString().slice(0, 10)
  const gymId = req.gym.id

  const { data: members, error: memberError } = await supabase
    .from('members')
    .select(`id, name, phone, display_name, member_packages(id, remaining_sessions, expires_at, package:packages(name))`)
    .eq('role', 'member')
    .eq('gym_id', gymId)
    .order('name')

  if (memberError) return res.status(500).json({ error: memberError.message })

  const { data: todayCheckins } = await supabase
    .from('checkins')
    .select('member_id')
    .eq('gym_id', gymId)
    .gte('checked_in_at', `${today}T00:00:00`)
    .lte('checked_in_at', `${today}T23:59:59`)

  const checkedInIds = new Set(todayCheckins?.map(c => c.member_id) || [])

  const result = members.map(m => ({
    ...m,
    checked_in_today: checkedInIds.has(m.id),
    active_packages: m.member_packages.filter(p => p.remaining_sessions > 0),
  }))

  res.json({ members: result })
}

export async function generateQrToken(req, res) {
  const token = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

  const { error } = await supabase
    .from('qr_tokens')
    .insert({ token, expires_at: expiresAt.toISOString(), gym_id: req.gym.id })

  if (error) return res.status(500).json({ error: error.message })

  const liffUrl = process.env.LIFF_URL || 'https://fit-track-liff.vercel.app'
  res.json({
    token,
    expires_at: expiresAt.toISOString(),
    qr_url: `${liffUrl}/?gym=${req.gym.id}&token=${token}`,
  })
}

export async function getAllCheckins(req, res) {
  const { month, member_id } = req.query

  let query = supabase
    .from('checkins')
    .select('*, member:member_id(name), member_package:member_package_id(package:package_id(name))')
    .eq('gym_id', req.gym.id)
    .order('checked_in_at', { ascending: false })

  if (month) {
    const [year, mon] = month.split('-').map(Number)
    const lastDay = new Date(year, mon, 0).getDate()
    query = query.gte('checked_in_at', `${month}-01`).lte('checked_in_at', `${month}-${lastDay}`)
  }
  if (member_id) query = query.eq('member_id', member_id)

  const { data, error } = await query
  if (error) return res.status(500).json({ error: error.message })
  res.json({ checkins: data })
}

export async function getMonthlyReport(req, res) {
  const { month } = req.query
  if (!month) return res.status(400).json({ error: '請提供 month 參數（格式：YYYY-MM）' })

  const [year, mon] = month.split('-').map(Number)
  const lastDay = new Date(year, mon, 0).getDate()

  const { data: checkins, error } = await supabase
    .from('checkins')
    .select('*, member:member_id(id, name), member_package:member_package_id(package:package_id(name))')
    .eq('gym_id', req.gym.id)
    .gte('checked_in_at', `${month}-01`)
    .lte('checked_in_at', `${month}-${lastDay}`)
    .order('checked_in_at', { ascending: true })

  if (error) return res.status(500).json({ error: error.message })

  const memberMap = {}
  for (const c of checkins) {
    const id = c.member?.id
    if (!id) continue
    if (!memberMap[id]) {
      memberMap[id] = { id, name: c.member.name, count: 0, dates: [], methods: {} }
    }
    memberMap[id].count++
    memberMap[id].dates.push(c.checked_in_at.slice(0, 10))
    memberMap[id].methods[c.method] = (memberMap[id].methods[c.method] || 0) + 1
  }

  const breakdown = Object.values(memberMap).sort((a, b) => b.count - a.count)

  res.json({ month, total_checkins: checkins.length, unique_members: breakdown.length, breakdown })
}
