import supabase from '../lib/supabase.js'
import { pushMessage, classReminderMessage } from '../lib/line.js'

export async function sendClassReminders(req, res) {
  if (req.query.secret !== process.env.NOTIFY_SECRET) {
    return res.status(401).json({ error: 'unauthorized' })
  }

  const now = new Date()
  const windowStart = new Date(now.getTime() + 50 * 60 * 1000).toISOString()
  const windowEnd   = new Date(now.getTime() + 70 * 60 * 1000).toISOString()

  const { data: classes, error: classErr } = await supabase
    .from('classes')
    .select('id, title, start_at, coach:coach_id(name), gym:gym_id(line_channel_access_token)')
    .gte('start_at', windowStart)
    .lte('start_at', windowEnd)

  if (classErr) return res.status(500).json({ error: classErr.message })
  if (!classes?.length) return res.json({ sent: 0, message: 'no upcoming classes' })

  const classIds = classes.map(c => c.id)
  const classMap = Object.fromEntries(classes.map(c => [c.id, c]))

  const { data: enrollments, error: enErr } = await supabase
    .from('class_enrollments')
    .select('id, class_id, member:member_id(name, line_uid)')
    .in('class_id', classIds)
    .eq('status', 'confirmed')
    .is('reminded_at', null)

  if (enErr) return res.status(500).json({ error: enErr.message })
  if (!enrollments?.length) return res.json({ sent: 0, message: 'no pending reminders' })

  let sent = 0
  const remindedAt = now.toISOString()

  for (const enrollment of enrollments) {
    const cls = classMap[enrollment.class_id]
    const member = enrollment.member
    if (!member?.line_uid || !cls?.gym?.line_channel_access_token) continue

    try {
      await pushMessage(
        member.line_uid,
        [classReminderMessage(member.name, cls)],
        cls.gym.line_channel_access_token
      )
      await supabase
        .from('class_enrollments')
        .update({ reminded_at: remindedAt })
        .eq('id', enrollment.id)
      sent++
    } catch (err) {
      console.error(`Reminder failed for ${member.name}:`, err.message)
    }
  }

  res.json({ sent, total: enrollments.length })
}
