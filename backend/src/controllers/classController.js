import supabase from '../lib/supabase.js'
import { pushMessage, classInviteMessage } from '../lib/line.js'

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
  for (const cls of classes) {
    const { title, start_at, end_at, max_students, notes, member_ids } = cls
    if (!start_at) continue

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

  res.json({ created: results.length, classes: results })
}

export async function updateClass(req, res) {
  const { title, start_at, end_at, max_students, notes } = req.body
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
