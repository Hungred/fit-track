import supabase from '../lib/supabase.js'

const DAYS = ['日', '一', '二', '三', '四', '五', '六']
const MS_HOUR = 3600000

// 檢查 sessionTimes（即將建立的堂次時間）是否與其他團課的既有堂次重疊
async function findConflictingSessions(gymId, groupClassId, sessionTimes, durationMinutes) {
  if (!sessionTimes.length) return []
  const times = sessionTimes.map(t => new Date(t).getTime())
  const windowStart = new Date(Math.min(...times) - MS_HOUR).toISOString()
  const windowEnd = new Date(Math.max(...times) + durationMinutes * 60000 + MS_HOUR).toISOString()

  const { data: existing, error } = await supabase
    .from('group_class_sessions')
    .select('id, scheduled_at, term:term_id(group_class:group_class_id(id, name, duration_minutes))')
    .eq('gym_id', gymId)
    .gte('scheduled_at', windowStart)
    .lte('scheduled_at', windowEnd)
  if (error) throw new Error(error.message)

  const conflicts = []
  for (const t of sessionTimes) {
    const s1 = new Date(t).getTime()
    const e1 = s1 + durationMinutes * 60000
    for (const ex of existing || []) {
      const otherClass = ex.term?.group_class
      if (!otherClass || otherClass.id === groupClassId) continue
      const s2 = new Date(ex.scheduled_at).getTime()
      const e2 = s2 + (otherClass.duration_minutes || 60) * 60000
      if (s1 < e2 && e1 > s2) {
        conflicts.push({ scheduled_at: t, conflict_with: otherClass.name })
      }
    }
  }
  return conflicts
}

// ── Group Classes ──────────────────────────────────────────

export async function listSessionsForMonth(req, res) {
  const { month } = req.query
  const base = month || new Date().toISOString().slice(0, 7)
  const [year, mon] = base.split('-').map(Number)
  const start = `${base}-01`
  const end = new Date(year, mon, 1).toISOString().slice(0, 10)

  const { data, error } = await supabase
    .from('group_class_sessions')
    .select('*, term:term_id(group_class:group_class_id(id, name, coach:coach_id(name), max_students))')
    .eq('gym_id', req.gym.id)
    .gte('scheduled_at', start)
    .lt('scheduled_at', end)
    .order('scheduled_at')

  if (error) return res.status(500).json({ error: error.message })
  res.json({ sessions: data })
}

export async function listGroupClasses(req, res) {
  const { data, error } = await supabase
    .from('group_classes')
    .select('*, coach:coach_id(id, name)')
    .eq('gym_id', req.gym.id)
    .order('created_at')
  if (error) return res.status(500).json({ error: error.message })
  res.json({ group_classes: data })
}

export async function createGroupClass(req, res) {
  const { name, description, coach_id, day_of_week, start_time, duration_minutes,
    price_per_term, price_per_session, sessions_per_term, max_students } = req.body
  if (!name) return res.status(400).json({ error: '團課名稱為必填' })

  const { data, error } = await supabase
    .from('group_classes')
    .insert({
      gym_id: req.gym.id, name, description, coach_id: coach_id || null,
      day_of_week, start_time, duration_minutes: duration_minutes || 60,
      price_per_term: price_per_term || 0, price_per_session: price_per_session || 0,
      sessions_per_term: sessions_per_term || 8, max_students: max_students || null,
    })
    .select('*, coach:coach_id(id, name)')
    .single()
  if (error) return res.status(500).json({ error: error.message })
  res.json({ group_class: data })
}

export async function updateGroupClass(req, res) {
  const { id } = req.params
  const { name, description, coach_id, day_of_week, start_time, duration_minutes,
    price_per_term, price_per_session, sessions_per_term, max_students, is_active } = req.body

  const { data, error } = await supabase
    .from('group_classes')
    .update({
      name, description, coach_id: coach_id || null,
      day_of_week, start_time, duration_minutes,
      price_per_term, price_per_session, sessions_per_term,
      max_students: max_students || null, is_active,
    })
    .eq('id', id)
    .eq('gym_id', req.gym.id)
    .select('*, coach:coach_id(id, name)')
    .single()
  if (error) return res.status(500).json({ error: error.message })
  res.json({ group_class: data })
}

export async function deleteGroupClass(req, res) {
  const { id } = req.params
  const { error } = await supabase
    .from('group_classes')
    .delete()
    .eq('id', id)
    .eq('gym_id', req.gym.id)
  if (error) return res.status(500).json({ error: error.message })
  res.json({ ok: true })
}

// ── Terms ──────────────────────────────────────────────────

export async function listTerms(req, res) {
  const { classId } = req.params
  const { data, error } = await supabase
    .from('group_class_terms')
    .select('*, enrollments:group_class_enrollments(count)')
    .eq('group_class_id', classId)
    .eq('gym_id', req.gym.id)
    .order('term_number')
  if (error) return res.status(500).json({ error: error.message })
  res.json({ terms: data })
}

export async function createTerm(req, res) {
  const { classId } = req.params
  const { start_date, notes } = req.body
  if (!start_date) return res.status(400).json({ error: '開始日期為必填' })

  // 取得團課設定
  const { data: gc, error: gcErr } = await supabase
    .from('group_classes')
    .select('*')
    .eq('id', classId)
    .eq('gym_id', req.gym.id)
    .single()
  if (gcErr || !gc) return res.status(404).json({ error: '找不到團課' })

  // 先算出這一期所有堂次的時間（尚未寫入 DB）
  const sessionTimes = []
  if (gc.day_of_week !== null && gc.start_time) {
    let date = new Date(start_date + 'T00:00:00+08:00')
    let count = 0
    while (count < gc.sessions_per_term) {
      if (date.getDay() === gc.day_of_week) {
        const [h, m] = gc.start_time.split(':')
        const scheduledAt = new Date(date)
        scheduledAt.setHours(parseInt(h), parseInt(m), 0, 0)
        sessionTimes.push(scheduledAt.toISOString())
        count++
      }
      date.setDate(date.getDate() + 1)
    }
  }

  // 檢查是否與其他團課的堂次重疊（同時段最多開放 1 組團課）
  if (sessionTimes.length) {
    const conflicts = await findConflictingSessions(req.gym.id, classId, sessionTimes, gc.duration_minutes || 60)
    if (conflicts.length) {
      const detail = conflicts
        .map(c => `${new Date(c.scheduled_at).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', hour12: false })}（撞「${c.conflict_with}」）`)
        .join('、')
      return res.status(409).json({
        error: `開新期失敗，以下堂次與其他團課時段重疊：${detail}`,
        conflicts,
      })
    }
  }

  // 計算期次
  const { count } = await supabase
    .from('group_class_terms')
    .select('*', { count: 'exact', head: true })
    .eq('group_class_id', classId)
  const term_number = (count || 0) + 1

  // 建立期別
  const { data: term, error: termErr } = await supabase
    .from('group_class_terms')
    .insert({ gym_id: req.gym.id, group_class_id: classId, term_number, start_date, notes })
    .select()
    .single()
  if (termErr) return res.status(500).json({ error: termErr.message })

  // 自動產生 sessions
  if (sessionTimes.length) {
    const sessions = sessionTimes.map((scheduledAt, i) => ({
      gym_id: req.gym.id,
      term_id: term.id,
      session_number: i + 1,
      scheduled_at: scheduledAt,
    }))
    await supabase.from('group_class_sessions').insert(sessions)
  }

  res.json({ term })
}

export async function updateTerm(req, res) {
  const { termId } = req.params
  const { status, notes, start_date } = req.body
  const { data, error } = await supabase
    .from('group_class_terms')
    .update({ status, notes, start_date })
    .eq('id', termId)
    .eq('gym_id', req.gym.id)
    .select()
    .single()
  if (error) return res.status(500).json({ error: error.message })
  res.json({ term: data })
}

export async function deleteTerm(req, res) {
  const { termId } = req.params
  const { error } = await supabase
    .from('group_class_terms')
    .delete()
    .eq('id', termId)
    .eq('gym_id', req.gym.id)
  if (error) return res.status(500).json({ error: error.message })
  res.json({ ok: true })
}

// ── Enrollments ────────────────────────────────────────────

export async function listEnrollments(req, res) {
  const { termId } = req.params
  const { data, error } = await supabase
    .from('group_class_enrollments')
    .select('*, member:member_id(name, phone)')
    .eq('term_id', termId)
    .eq('gym_id', req.gym.id)
    .order('created_at')
  if (error) return res.status(500).json({ error: error.message })
  res.json({ enrollments: data })
}

export async function createEnrollment(req, res) {
  const { termId } = req.params
  const { member_id, renter_name, renter_phone, renter_line_uid, notes } = req.body

  // 確認期別存在且開放
  const { data: term, error: termErr } = await supabase
    .from('group_class_terms')
    .select('*, group_class:group_class_id(max_students)')
    .eq('id', termId)
    .eq('gym_id', req.gym.id)
    .single()
  if (termErr || !term) return res.status(404).json({ error: '找不到期別' })
  if (term.status === 'closed') return res.status(400).json({ error: '此期別已截止報名' })

  // 確認名額
  if (term.group_class?.max_students) {
    const { count } = await supabase
      .from('group_class_enrollments')
      .select('*', { count: 'exact', head: true })
      .eq('term_id', termId)
    if (count >= term.group_class.max_students) {
      return res.status(400).json({ error: '名額已滿' })
    }
  }

  const { data, error } = await supabase
    .from('group_class_enrollments')
    .insert({
      gym_id: req.gym.id, term_id: termId,
      member_id: member_id || null,
      renter_name, renter_phone, renter_line_uid, notes,
    })
    .select()
    .single()
  if (error) {
    if (error.code === '23505') return res.status(400).json({ error: '您已報名此期別' })
    return res.status(500).json({ error: error.message })
  }
  res.json({ enrollment: data })
}

export async function updateEnrollment(req, res) {
  const { enrollmentId } = req.params
  const { payment_status, notes } = req.body
  const { data, error } = await supabase
    .from('group_class_enrollments')
    .update({ payment_status, notes })
    .eq('id', enrollmentId)
    .eq('gym_id', req.gym.id)
    .select()
    .single()
  if (error) return res.status(500).json({ error: error.message })
  res.json({ enrollment: data })
}

export async function deleteEnrollment(req, res) {
  const { enrollmentId } = req.params
  const { error } = await supabase
    .from('group_class_enrollments')
    .delete()
    .eq('id', enrollmentId)
    .eq('gym_id', req.gym.id)
  if (error) return res.status(500).json({ error: error.message })
  res.json({ ok: true })
}

// ── Public (LIFF) ──────────────────────────────────────────

export async function listPublicGroupClasses(req, res) {
  const { data, error } = await supabase
    .from('group_classes')
    .select(`
      *,
      coach:coach_id(name),
      terms:group_class_terms(
        id, term_number, start_date, end_date, status,
        enrollments:group_class_enrollments(count)
      )
    `)
    .eq('gym_id', req.gym.id)
    .eq('is_active', true)
    .order('created_at')
  if (error) return res.status(500).json({ error: error.message })
  res.json({ group_classes: data })
}
