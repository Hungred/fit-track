import 'dotenv/config'
import express from 'express'
import cors from 'cors'

import authRouter from './routes/auth.js'
import webhookRouter from './routes/webhook.js'
import memberRouter from './routes/members.js'
import checkinRouter from './routes/checkin.js'
import coachRouter from './routes/coach.js'

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors({
  origin: [process.env.FRONTEND_URL, process.env.ADMIN_URL].filter(Boolean),
  credentials: true,
}))

app.use(express.json())

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'Fit Track API' }))

app.use('/api/auth', authRouter)

app.use('/webhook', webhookRouter)
app.use('/api/members', memberRouter)
app.use('/api/checkin', checkinRouter)
app.use('/api/coach', coachRouter)

app.listen(PORT, () => {
  console.log(`Fit Track API running on port ${PORT}`)
})
