import supabase from '../lib/supabase.js'

export async function bindMember(req, res) {
  const { name, phone } = req.body
  const lineUid = req.headers['x-line-uid']
  const lineDisplayName = req.headers['x-line-display-name'] || ''
  const gymId = req.gym.id

  if (!name || !phone) return res.status(400).json({ error: '姓名與電話為必填' })

  const { data, error } = await supabase
    .from('members')
    .upsert(
      { line_uid: lineUid, name, phone, display_name: lineDisplayName, role: 'member', gym_id: gymId },
      { onConflict: 'line_uid' }
    )
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.json({ member: data })
}

export async function getMe(req, res) {
  const { data: packages, error } = await supabase
    .from('member_packages')
    .select('*, package:packages(name)')
    .eq('member_id', req.member.id)
    .eq('gym_id', req.gym.id)
    .gt('remaining_sessions', 0)
    .order('created_at', { ascending: true })

  if (error) return res.status(500).json({ error: error.message })
  res.json({ member: req.member, packages })
}

export async function getCheckinHistory(req, res) {
  const { month } = req.query

  let query = supabase
    .from('checkins')
    .select('*, member_package:member_package_id(package:package_id(name))')
    .eq('member_id', req.member.id)
    .eq('gym_id', req.gym.id)
    .order('checked_in_at', { ascending: false })

  if (month) {
    const [year, mon] = month.split('-').map(Number)
    const lastDay = new Date(year, mon, 0).getDate()
    query = query.gte('checked_in_at', `${month}-01`).lte('checked_in_at', `${month}-${lastDay}`)
  }

  const { data, error } = await query
  if (error) return res.status(500).json({ error: error.message })
  res.json({ checkins: data })
}
