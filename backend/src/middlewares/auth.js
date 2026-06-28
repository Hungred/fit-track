import supabase from '../lib/supabase.js'

export async function requireMember(req, res, next) {
  const lineUid = req.headers['x-line-uid']
  if (!lineUid) return res.status(401).json({ error: '未授權' })

  const { data: member, error } = await supabase
    .from('members')
    .select('*')
    .eq('line_uid', lineUid)
    .eq('gym_id', req.gym.id)
    .single()

  if (error || !member) return res.status(401).json({ error: '找不到學員資料，請先完成綁定' })

  req.member = member
  next()
}

export async function requireCoach(req, res, next) {
  const lineUid = req.headers['x-line-uid']
  if (!lineUid) return res.status(401).json({ error: '未授權' })

  const { data: member, error } = await supabase
    .from('members')
    .select('*')
    .eq('line_uid', lineUid)
    .eq('role', 'coach')
    .eq('gym_id', req.gym.id)
    .single()

  if (error || !member) return res.status(403).json({ error: '無教練權限' })

  req.member = member
  next()
}
