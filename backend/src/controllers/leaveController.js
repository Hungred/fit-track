import supabase from '../lib/supabase.js'

export async function requestLeave(req, res) {
  const { leave_date, reason } = req.body
  const memberId = req.member.id

  if (!leave_date) return res.status(400).json({ error: '請提供請假日期' })

  const { data, error } = await supabase
    .from('leaves')
    .insert({ member_id: memberId, leave_date, reason: reason || null })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') return res.status(400).json({ error: '該日期已請過假' })
    return res.status(500).json({ error: error.message })
  }

  res.json({ message: '請假成功', leave: data })
}

export async function cancelLeave(req, res) {
  const { leave_date } = req.body
  const memberId = req.member.id

  const { error } = await supabase
    .from('leaves')
    .delete()
    .eq('member_id', memberId)
    .eq('leave_date', leave_date)

  if (error) return res.status(500).json({ error: error.message })
  res.json({ message: '已取消請假' })
}

export async function getMyLeaves(req, res) {
  const { data, error } = await supabase
    .from('leaves')
    .select('*')
    .eq('member_id', req.member.id)
    .order('leave_date', { ascending: false })
    .limit(20)

  if (error) return res.status(500).json({ error: error.message })
  res.json({ leaves: data })
}

export async function getTodayLeaves(req, res) {
  const date = req.query.date || new Date().toISOString().slice(0, 10)

  const { data, error } = await supabase
    .from('leaves')
    .select('*, member:member_id(id, name)')
    .eq('leave_date', date)

  if (error) return res.status(500).json({ error: error.message })
  res.json({ leaves: data })
}
