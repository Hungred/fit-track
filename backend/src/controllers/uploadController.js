import multer from 'multer'
import supabase from '../lib/supabase.js'

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true)
    else cb(new Error('只允許上傳 PDF 檔案'))
  },
})

export const uploadMiddleware = upload.single('file')

export async function uploadFile(req, res) {
  if (!req.file) return res.status(400).json({ error: '請選擇 PDF 檔案' })

  const ext = '.pdf'
  const filename = `${req.gym.id}/${Date.now()}${ext}`

  const { error } = await supabase.storage
    .from('documents')
    .upload(filename, req.file.buffer, {
      contentType: 'application/pdf',
      upsert: false,
    })

  if (error) return res.status(500).json({ error: error.message })

  const { data } = supabase.storage.from('documents').getPublicUrl(filename)
  res.json({ url: data.publicUrl })
}
