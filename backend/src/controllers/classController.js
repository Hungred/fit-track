import supabase from '../lib/supabase.js'
import { pushMessage, classInviteMessage } from '../lib/line.js'

const MS_HOUR = 3600000
const MAX_CONCURRENT_CLASSES = 4

async function countOverlappingClasses(gymId, startAt, endAt, excludeId) {
  const s = new Date(startAt).getTime()
  const e = endAt ? new Date(endAt).getTime() : s + MS_HOUR
  const windowStart = new Date(s - 24 * MS_HOUR).toISOString()
  const windowEnd = new Date(e + 24 * MS_HOUR).toISOString()

  let query = supabase
    .from('classes')
    .select('id, start_at, end_at')
    .eq('gym_id', gymId)
    .gte('start_at', windowStart)
    .lte('start_at', windowEnd)
  if (excludeId) query = query.neq('id', excludeId)

  const { data, error } = await query
  if (error) throw new Error(error.message)

  return (data || []).filter(c => {
    const cs = new Date(c.start_at).getTime()
    const ce = c.end_at ? new Date(c.end_at).getTime() : cs + MS_HOUR
    return cs < e && ce > s
  }).length
}

// 同時段只能是「1 個團課」或「最多 4 堂私課」兩者擇一，不能並存
async function hasGroupSessionConflict(gymId, startAt, endAt) {
  const s = new Date(startAt).getTime()
  const e = endAt ? new Date(endAt).getTime() : s + MS_HOUR
  const windowStart = new Date(s - 24 * MS_HOUR).toISOString()
  const windowEnd = new Date(e + 24 * MS_HOUR).toISOString()

  const { data, error } = await supabase
    .from('group_class_sessions')
    .select('scheduled_at, term:term_id(group_class:group_class_id(duration_minutes))')
    .eq('gym_id', gymId)
    .gte('scheduled_at', windowStart)
    .lte('scheduled_at', windowEnd)
  if (error) throw new Error(error.message)

  return (data || []).some(gs => {
    const gs1 = new Date(gs.scheduled_at).getTime()
    const gs2 = gs1 + (gs.term?.group_class?.duration_minutes || 60) * 60000
    return gs1 < e && gs2 > s
  })
}

export async function listClasses(req, res) {
  const { month } = req.query
  const base = month || new Date().toISOString().slice(0, 7)
  const [year, mon] = base.split('-').map(Number)
  const start = `${base}-01`
  const end = new Date(year, mon, 1).toISOString().slice(0, 10)

  const { data, error } = await supabase
    .from('classes')
    .select('*, coach:coach_id(name), enrollments:class_enrollments(id, status, member:member_id(id, name))')
    .eq('gym_id', req.gym.id)
    .gte('start_at', start)
    .lt('start_at', end)
    .order('start_at')

  if (error) return res.status(500).json({ error: error.message })
  res.json({ classes: data })
}

export async function getClass(req, res) {
  const { data, error } = await supabase
    .from('classes')
    .select('*, coach:coach_id(name), enrollments:class_enrollments(id, status, member:member_id(id, name))')
    .eq('id', req.params.id)
    .eq('gym_id', req.gym.id)
    .single()

  if (error || !data) return res.status(404).json({ error: '找不到此課程' })
  res.json({ class: data })
}

export async function createClass(req, res) {
  const { title, start_at, end_at, max_students, notes, member_ids } = req.body
  if (!start_at) return res.status(400).json({ error: '開始時間為必填' })

  const overlapping = await countOverlappingClasses(req.gym.id, start_at, end_at)
  if (overlapping >= MAX_CONCURRENT_CLASSES) {
    return res.status(409).json({ error: `此時段私人課已達上限（${MAX_CONCURRENT_CLASSES} 組），請選擇其他時間` })
  }
  if (await hasGroupSessionConflict(req.gym.id, start_at, end_at)) {
    return res.status(409).json({ error: '此時段已有團課，無法同時新增私人課程' })
  }

  const { data: cls, error } = await supabase
    .from('classes')
    .insert({
      gym_id: req.gym.id,
      coach_id: req.member.id,
      title: title || '上課',
      start_at,
      end_at: end_at || null,
      max_students: max_students || null,
      notes: notes || null,
    })
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })

  if (member_ids?.length) {
    const { data: members } = await supabase
      .from('members')
      .select('id, name, line_uid')
      .in('id', member_ids)
      .eq('gym_id', req.gym.id)
      .eq('role', 'member')

    if (members?.length) {
      await supabase.from('class_enrollments').insert(
        members.map(m => ({ class_id: cls.id, member_id: m.id, gym_id: req.gym.id }))
      )

      const accessToken = req.gym.line_channel_access_token
      if (accessToken) {
        await Promise.allSettled(
          members.map(m => pushMessage(m.line_uid, [classInviteMessage(m.name, cls, req.gym.name)], accessToken))
        )
      }
    }
  }

  res.json({ class: cls })
}

export async function batchCreateClasses(req, res) {
  const { classes } = req.body
  if (!classes?.length) return res.status(400).json({ error: '請提供至少一筆課程' })

  const results = []
  const skipped = []
  for (const cls of classes) {
    const { title, start_at, end_at, max_students, notes, member_ids } = cls
    if (!start_at) continue

    const overlapping = await countOverlappingClasses(req.gym.id, start_at, end_at)
    if (overlapping >= MAX_CONCURRENT_CLASSES) {
      skipped.push({ start_at, reason: `此時段私人課已達上限（${MAX_CONCURRENT_CLASSES} 組）` })
      continue
    }
    if (await hasGroupSessionConflict(req.gym.id, start_at, end_at)) {
      skipped.push({ start_at, reason: '此時段已有團課' })
      continue
    }

    const { data: created, error } = await supabase
      .from('classes')
      .insert({
        gym_id: req.gym.id,
        coach_id: req.member.id,
        title: title || '上課',
        start_at,
        end_at: end_at || null,
        max_students: max_students || null,
        notes: notes || null,
      })
      .select()
      .single()

    if (error || !created) continue
    results.push(created)

    if (member_ids?.length) {
      const { data: members } = await supabase
        .from('members')
        .select('id, name, line_uid')
        .in('id', member_ids)
        .eq('gym_id', req.gym.id)
        .eq('role', 'member')

      if (members?.length) {
        await supabase.from('class_enrollments').insert(
          members.map(m => ({ class_id: created.id, member_id: m.id, gym_id: req.gym.id }))
        )
        const accessToken = req.gym.line_channel_access_token
        if (accessToken) {
          await Promise.allSettled(
            members.map(m => pushMessage(m.line_uid, [classInviteMessage(m.name, created, req.gym.name)], accessToken))
          )
        }
      }
    }
  }

  res.json({ created: results.length, classes: results, skipped })
}

export async function updateClass(req, res) {
  const { title, start_at, end_at, max_students, notes } = req.body

  if (start_at !== undefined || end_at !== undefined) {
    const { data: existing } = await supabase
      .from('classes')
      .select('start_at, end_at')
      .eq('id', req.params.id)
      .eq('gym_id', req.gym.id)
      .single()
    if (!existing) return res.status(404).json({ error: '找不到課程' })

    const finalStart = start_at !== undefined ? start_at : existing.start_at
    const finalEnd = end_at !== undefined ? end_at : existing.end_at

    const overlapping = await countOverlappingClasses(req.gym.id, finalStart, finalEnd, req.params.id)
    if (overlapping >= MAX_CONCURRENT_CLASSES) {
      return res.status(409).json({ error: `此時段私人課已達上限（${MAX_CONCURRENT_CLASSES} 組），請選擇其他時間` })
    }
    if (await hasGroupSessionConflict(req.gym.id, finalStart, finalEnd)) {
      return res.status(409).json({ error: '此時段已有團課，無法同時新增私人課程' })
    }
  }

  const updates = {}
  if (title !== undefined) updates.title = title
  if (start_at !== undefined) updates.start_at = start_at
  if (end_at !== undefined) updates.end_at = end_at
  if (max_students !== undefined) updates.max_students = max_students
  if (notes !== undefined) updates.notes = notes

  const { data, error } = await supabase
    .from('classes')
    .update(updates)
    .eq('id', req.params.id)
    .eq('gym_id', req.gym.id)
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.json({ class: data })
}

export async function deleteClass(req, res) {
  const { error } = await supabase
    .from('classes')
    .delete()
    .eq('id', req.params.id)
    .eq('gym_id', req.gym.id)

  if (error) return res.status(500).json({ error: error.message })
  res.json({ ok: true })
}

export async function getMemberClasses(req, res) {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from('class_enrollments')
    .select('id, status, updated_at, class:class_id(id, title, start_at, end_at, notes, coach:coach_id(name))')
    .eq('member_id', req.member.id)
    .eq('gym_id', req.gym.id)
    .order('created_at', { ascending: false })
    .limit(30)

  if (error) return res.status(500).json({ error: error.message })

  const enrollments = data.filter(e => e.class && new Date(e.class.start_at) >= new Date(since))
  res.json({ enrollments })
}

export async function updateMemberEnrollment(req, res) {
  const { classId } = req.params
  const { status } = req.body
  const allowed = ['confirmed', 'leave', 'discuss']
  if (!allowed.includes(status)) return res.status(400).json({ error: '狀態無效' })

  const { data: existing } = await supabase
    .from('class_enrollments')
    .select('status')
    .eq('class_id', classId)
    .eq('member_id', req.member.id)
    .eq('gym_id', req.gym.id)
    .single()

  if (existing?.status === 'attended') return res.status(400).json({ error: '您已完成打卡出席，無法再更改狀態' })

  const { data: enrollment, error } = await supabase
    .from('class_enrollments')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('class_id', classId)
    .eq('member_id', req.member.id)
    .eq('gym_id', req.gym.id)
    .select()
    .single()

  if (error || !enrollment) return res.status(404).json({ error: '找不到報名記錄' })

  if (status === 'discuss') {
    const { data: cls } = await supabase
      .from('classes')
      .select('title, coach:coach_id(line_uid)')
      .eq('id', classId)
      .single()

    if (cls?.coach?.line_uid && req.gym.line_channel_access_token) {
      await pushMessage(
        cls.coach.line_uid,
        [{ type: 'text', text: `💬 ${req.member.name} 想跟你討論「${cls.title || '上課'}」課程內容，請主動聯繫。` }],
        req.gym.line_channel_access_token
      )
    }
  }

  res.json({ enrollment })
}

export async function updateEnrollmentByCoach(req, res) {
  const { id: classId, memberId } = req.params
  const { status } = req.body
  const allowed = ['pending', 'confirmed', 'leave', 'discuss']
  if (!allowed.includes(status)) return res.status(400).json({ error: '狀態無效' })

  const { data: enrollment, error } = await supabase
    .from('class_enrollments')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('class_id', classId)
    .eq('member_id', memberId)
    .eq('gym_id', req.gym.id)
    .select()
    .single()

  if (error || !enrollment) return res.status(404).json({ error: '找不到報名記錄' })
  res.json({ enrollment })
}

export async function getClassIcal(req, res) {
  const { data: cls } = await supabase
    .from('classes')
    .select('*')
    .eq('id', req.params.id)
    .single()

  if (!cls) return res.status(404).send('Not found')

  const fmt = (iso) => iso.replace(/[-:.]/g, '').slice(0, 15) + 'Z'
  const start = fmt(cls.start_at)
  const end = cls.end_at
    ? fmt(cls.end_at)
    : fmt(new Date(new Date(cls.start_at).getTime() + 60 * 60 * 1000).toISOString())
  const now = fmt(new Date().toISOString())

  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Fit Track//EN',
    'BEGIN:VEVENT',
    `UID:${cls.id}@fittrack`,
    `DTSTAMP:${now}`, `DTSTART:${start}`, `DTEND:${end}`,
    `SUMMARY:${cls.title}`,
    cls.notes ? `DESCRIPTION:${cls.notes.replace(/\n/g, '\\n')}` : '',
    'END:VEVENT', 'END:VCALENDAR',
  ].filter(Boolean)

  res.setHeader('Content-Type', 'text/calendar; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="class.ics"`)
  res.send(lines.join('\r\n'))
}
