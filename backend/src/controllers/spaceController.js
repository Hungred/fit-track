import supabase from '../lib/supabase.js'
import { pushMessage, spaceBookingReceivedMessage, spaceBookingConfirmedMessage } from '../lib/line.js'

// ---------- Spaces ----------

export async function listSpaces(req, res) {
  const { data, error } = await supabase
    .from('spaces')
    .select('*')
    .eq('gym_id', req.gym.id)
    .order('created_at')
  if (error) return res.status(500).json({ error: error.message })
  res.json({ spaces: data })
}

export async function createSpace(req, res) {
  const { name, description, price_per_hour, capacity, available_days, open_time, close_time } = req.body
  if (!name) return res.status(400).json({ error: '場地名稱為必填' })
  const { data, error } = await supabase
    .from('spaces')
    .insert({ gym_id: req.gym.id, name, description, price_per_hour, capacity, available_days, open_time, close_time })
    .select()
    .single()
  if (error) return res.status(500).json({ error: error.message })
  res.json({ space: data })
}

export async function updateSpace(req, res) {
  const { id } = req.params
  const { name, description, price_per_hour, capacity, available_days, open_time, close_time, is_active } = req.body
  const { data, error } = await supabase
    .from('spaces')
    .update({ name, description, price_per_hour, capacity, available_days, open_time, close_time, is_active })
    .eq('id', id)
    .eq('gym_id', req.gym.id)
    .select()
    .single()
  if (error) return res.status(500).json({ error: error.message })
  res.json({ space: data })
}

export async function deleteSpace(req, res) {
  const { id } = req.params
  const { error } = await supabase.from('spaces').delete().eq('id', id).eq('gym_id', req.gym.id)
  if (error) return res.status(500).json({ error: error.message })
  res.json({ ok: true })
}

// ---------- Bookings ----------

export async function listBookings(req, res) {
  const { month } = req.query
  let query = supabase
    .from('space_bookings')
    .select('*, space:space_id(name, price_per_hour)')
    .eq('gym_id', req.gym.id)
    .order('start_at')

  if (month) {
    const [year, mon] = month.split('-').map(Number)
    const start = `${month}-01`
    const end = new Date(year, mon, 1).toISOString().slice(0, 10)
    query = query.gte('start_at', start).lt('start_at', end)
  }

  const { data, error } = await query
  if (error) return res.status(500).json({ error: error.message })
  res.json({ bookings: data })
}

export async function createBooking(req, res) {
  const { space_id, renter_name, renter_phone, renter_line_uid, start_at, end_at, notes } = req.body
  if (!space_id || !renter_name || !start_at || !end_at) {
    return res.status(400).json({ error: '場地、租借人、時間為必填' })
  }

  const { data: conflicts } = await supabase
    .from('space_bookings')
    .select('id')
    .eq('space_id', space_id)
    .neq('status', 'cancelled')
    .lt('start_at', end_at)
    .gt('end_at', start_at)

  if (conflicts?.length) return res.status(409).json({ error: '此時段已被預約' })

  const { data: space } = await supabase.from('spaces').select('*').eq('id', space_id).single()
  if (!space) return res.status(404).json({ error: '找不到場地' })

  const hours = (new Date(end_at) - new Date(start_at)) / 3600000
  const total_price = Math.round(hours * space.price_per_hour)

  const { data: booking, error } = await supabase
    .from('space_bookings')
    .insert({ gym_id: req.gym.id, space_id, renter_name, renter_phone, renter_line_uid, start_at, end_at, total_price, notes })
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })

  if (renter_line_uid && req.gym.line_channel_access_token) {
    pushMessage(
      renter_line_uid,
      [spaceBookingReceivedMessage(renter_name, booking, space.name)],
      req.gym.line_channel_access_token
    ).catch(() => {})
  }

  res.json({ booking })
}

export async function updateBooking(req, res) {
  const { id } = req.params
  const { status, renter_name, renter_phone, start_at, end_at, notes } = req.body

  const { data: existing } = await supabase
    .from('space_bookings')
    .select('*, space:space_id(name)')
    .eq('id', id)
    .eq('gym_id', req.gym.id)
    .single()
  if (!existing) return res.status(404).json({ error: '找不到預約' })

  const updates = {}
  if (status !== undefined) updates.status = status
  if (renter_name !== undefined) updates.renter_name = renter_name
  if (renter_phone !== undefined) updates.renter_phone = renter_phone
  if (notes !== undefined) updates.notes = notes
  if (start_at !== undefined) updates.start_at = start_at
  if (end_at !== undefined) updates.end_at = end_at

  const { data: booking, error } = await supabase
    .from('space_bookings')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })

  if (status === 'confirmed' && existing.renter_line_uid && req.gym.line_channel_access_token) {
    pushMessage(
      existing.renter_line_uid,
      [spaceBookingConfirmedMessage(existing.renter_name, { ...existing, ...updates }, existing.space?.name)],
      req.gym.line_channel_access_token
    ).catch(() => {})
  }

  res.json({ booking })
}

export async function deleteBooking(req, res) {
  const { id } = req.params
  const { error } = await supabase.from('space_bookings').delete().eq('id', id).eq('gym_id', req.gym.id)
  if (error) return res.status(500).json({ error: error.message })
  res.json({ ok: true })
}
