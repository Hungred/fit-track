import supabase from '../lib/supabase.js'

export async function requireGym(req, res, next) {
  const gymId = req.headers['x-gym-id']
  if (!gymId) return res.status(400).json({ error: '缺少 x-gym-id header' })

  const { data: gym } = await supabase
    .from('gyms')
    .select('*')
    .eq('id', gymId)
    .eq('status', 'active')
    .single()

  if (!gym) return res.status(404).json({ error: '健身房不存在或已停用' })

  req.gym = gym
  next()
}

export async function requireOperator(req, res, next) {
  const password = req.headers['x-operator-password']
  if (!password || password !== process.env.SUPER_ADMIN_PASSWORD) {
    return res.status(401).json({ error: '無營運方權限' })
  }
  next()
}
