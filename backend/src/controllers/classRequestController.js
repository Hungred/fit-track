import supabase from '../lib/supabase.js'
import { pushMessage, classInviteMessage } from '../lib/line.js'

export async function submitRequest(req, res) {
  const { preferred_dates, notes } = req.body
  if (!preferred_dates?.length) return res.status(400).json({ error: '請至少填寫一個希望時間' })

  const { data, error } = await supabase
    .from('class_requests')
    .insert({ gym_id: req.gym.id, member_id: req.member.id, preferred_dates, notes: notes || null })
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })

  // 推播給所有教練
  const { data: coaches } = await supabase
    .from('members')
    .select('line_uid')
    .eq('gym_id', req.gym.id)
    .eq('role', 'coach')
    .not('line_uid', 'is', null)

  const token = req.gym.line_channel_access_token
  if (coaches?.length && token) {
    const dates = preferred_dates
      .map(d => new Date(d).toLocaleString('zh-TW', {
        timeZone: 'Asia/Taipei', month: 'numeric', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
      }))
      .join('、')
    const msg = {
      type: 'text',
      text: `📩 ${req.member.name} 申請了私人課程\n\n希望時間：${dates}${notes ? `\n備注：${notes}` : ''}\n\n請至後台「排課管理 → 待確認申請」處理`,
    }
    await Promise.allSettled(coaches.map(c => pushMessage(c.line_uid, [msg], token)))
  }

  res.json({ request: data })
}

export async function listRequests(req, res) {
  const { status = 'pending' } = req.query
  const { data, error } = await supabase
    .from('class_requests')
    .select('*, member:member_id(id, name, phone)')
    .eq('gym_id', req.gym.id)
    .eq('status', status)
    .order('created_at', { ascending: false })

  if (error) return res.status(500).json({ error: error.message })
  res.json({ requests: data })
}

export async function confirmRequest(req, res) {
  const { id } = req.params
  const { start_at, end_at, title, notes } = req.body
  if (!start_at) return res.status(400).json({ error: '請填寫上課時間' })

  const { data: request } = await supabase
    .from('class_requests')
    .select('*, member:member_id(id, name, line_uid)')
    .eq('id', id)
    .eq('gym_id', req.gym.id)
    .single()

  if (!request) return res.status(404).json({ error: '找不到申請' })
  if (request.status !== 'pending') return res.status(400).json({ error: '此申請已處理' })

  const { data: cls, error: clsError } = await supabase
    .from('classes')
    .insert({
      gym_id: req.gym.id,
      coach_id: req.member.id,
      title: title || '私人課程',
      start_at,
      end_at: end_at || null,
      notes: notes || null,
    })
    .select()
    .single()

  if (clsError) return res.status(500).json({ error: clsError.message })

  await supabase.from('class_enrollments').insert({
    class_id: cls.id, member_id: request.member.id, gym_id: req.gym.id,
  })

  await supabase
    .from('class_requests')
    .update({ status: 'confirmed', class_id: cls.id })
    .eq('id', id)

  const token = req.gym.line_channel_access_token
  if (token && request.member?.line_uid) {
    await pushMessage(
      request.member.line_uid,
      [classInviteMessage(request.member.name, cls, req.gym.name)],
      token,
    )
  }

  res.json({ class: cls })
}

export async function declineRequest(req, res) {
  const { id } = req.params

  const { data: request } = await supabase
    .from('class_requests')
    .select('*, member:member_id(id, name, line_uid)')
    .eq('id', id)
    .eq('gym_id', req.gym.id)
    .single()

  if (!request) return res.status(404).json({ error: '找不到申請' })

  await supabase.from('class_requests').update({ status: 'declined' }).eq('id', id)

  const token = req.gym.line_channel_access_token
  if (token && request.member?.line_uid) {
    await pushMessage(request.member.line_uid, [{
      type: 'text',
      text: `您好 ${request.member.name}，您申請的私人課程時間目前不方便安排，請再與我們聯繫選擇其他時間 🙏`,
    }], token)
  }

  res.json({ ok: true })
}
