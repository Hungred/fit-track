import supabase from '../lib/supabase.js'

export async function listFacilityPhotos(req, res) {
  const { data, error } = await supabase.storage
    .from('facility-photos')
    .list(req.gym.id, { sortBy: { column: 'name', order: 'asc' } })

  if (error) return res.status(500).json({ error: error.message })

  const photos = (data || [])
    .filter(f => /\.(jpe?g|png)$/i.test(f.name))
    .map(f => supabase.storage.from('facility-photos').getPublicUrl(`${req.gym.id}/${f.name}`).data.publicUrl)

  res.json({ photos })
}
