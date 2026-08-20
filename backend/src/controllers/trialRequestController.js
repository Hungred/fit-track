import ExcelJS from 'exceljs'
import supabase from '../lib/supabase.js'
import { pushMessage, trialRequestNotifyMessage } from '../lib/line.js'
import { CONTACT_TIME_LABELS, COACH_GENDER_LABELS, TRIAL_TIME_LABELS, formatSlots } from '../lib/trialRequestLabels.js'

const STATUS_LABELS = { pending: '待聯繫', contacted: '已聯繫', closed: '已結案' }

export async function submitTrialRequest(req, res) {
  const {
    name, phone, contact_info,
    contact_time_slots, coach_gender_preference, trial_time_slots,
    notes, line_uid,
  } = req.body

  if (!name || !phone || !contact_info) {
    return res.status(400).json({ error: '姓名、電話、聯絡方式為必填' })
  }
  if (!contact_time_slots?.length) return res.status(400).json({ error: '請選擇方便聯繫的時間' })
  if (!coach_gender_preference) return res.status(400).json({ error: '請選擇偏好的教練性別' })
  if (!trial_time_slots?.length) return res.status(400).json({ error: '請選擇期望體驗的時間' })

  const { data, error } = await supabase
    .from('trial_class_requests')
    .insert({
      gym_id: req.gym.id, name, phone, contact_info,
      contact_time_slots, coach_gender_preference, trial_time_slots,
      notes: notes || null, line_uid: line_uid || null,
    })
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })

  const accessToken = req.gym.line_channel_access_token
  if (accessToken) {
    const { data: coaches } = await supabase
      .from('members')
      .select('line_uid')
      .eq('gym_id', req.gym.id)
      .eq('role', 'coach')

    const realCoaches = (coaches || []).filter(c => c.line_uid && !c.line_uid.startsWith('coach_'))
    const adminUrl = `${process.env.ADMIN_URL}/trial-requests?gym=${req.gym.id}`
    const message = trialRequestNotifyMessage(data, adminUrl)
    await Promise.allSettled(
      realCoaches.map(c => pushMessage(c.line_uid, [message], accessToken))
    )
  }

  res.json({ request: data })
}

export async function listTrialRequests(req, res) {
  const { status } = req.query
  let query = supabase
    .from('trial_class_requests')
    .select('*')
    .eq('gym_id', req.gym.id)
    .order('created_at', { ascending: false })
  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) return res.status(500).json({ error: error.message })
  res.json({ requests: data })
}

export async function updateTrialRequestStatus(req, res) {
  const { status } = req.body
  if (!STATUS_LABELS[status]) return res.status(400).json({ error: '狀態無效' })

  const { data, error } = await supabase
    .from('trial_class_requests')
    .update({ status })
    .eq('id', req.params.id)
    .eq('gym_id', req.gym.id)
    .select()
    .single()

  if (error || !data) return res.status(404).json({ error: '找不到此申請' })
  res.json({ request: data })
}

export async function deleteTrialRequest(req, res) {
  const { error } = await supabase
    .from('trial_class_requests')
    .delete()
    .eq('id', req.params.id)
    .eq('gym_id', req.gym.id)
  if (error) return res.status(500).json({ error: error.message })
  res.json({ ok: true })
}

export async function exportTrialRequests(req, res) {
  const { data, error } = await supabase
    .from('trial_class_requests')
    .select('*')
    .eq('gym_id', req.gym.id)
    .order('created_at', { ascending: false })

  if (error) return res.status(500).json({ error: error.message })

  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('體驗課申請')
  sheet.columns = [
    { header: '送出時間', key: 'created_at', width: 18 },
    { header: '姓名', key: 'name', width: 12 },
    { header: '電話', key: 'phone', width: 14 },
    { header: 'LINE ID / 聯絡方式', key: 'contact_info', width: 20 },
    { header: '方便聯繫時間', key: 'contact_time_slots', width: 24 },
    { header: '偏好教練性別', key: 'coach_gender_preference', width: 16 },
    { header: '期望體驗時間', key: 'trial_time_slots', width: 24 },
    { header: '備註', key: 'notes', width: 24 },
    { header: '狀態', key: 'status', width: 10 },
  ]

  for (const r of data) {
    sheet.addRow({
      created_at: new Date(r.created_at).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' }),
      name: r.name,
      phone: r.phone,
      contact_info: r.contact_info,
      contact_time_slots: formatSlots(r.contact_time_slots, CONTACT_TIME_LABELS),
      coach_gender_preference: COACH_GENDER_LABELS[r.coach_gender_preference] || r.coach_gender_preference,
      trial_time_slots: formatSlots(r.trial_time_slots, TRIAL_TIME_LABELS),
      notes: r.notes || '',
      status: STATUS_LABELS[r.status] || r.status,
    })
  }
  sheet.getRow(1).font = { bold: true }

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  res.setHeader('Content-Disposition', 'attachment; filename="trial-requests.xlsx"')
  await workbook.xlsx.write(res)
  res.end()
}
