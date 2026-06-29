import 'dotenv/config'
import express from 'express'
import cors from 'cors'

import { requireGym } from './middlewares/gym.js'
import { getClassIcal } from './controllers/classController.js'
import authRouter from './routes/auth.js'
import webhookRouter from './routes/webhook.js'
import memberRouter from './routes/members.js'
import checkinRouter from './routes/checkin.js'
import coachRouter from './routes/coach.js'
import operatorRouter from './routes/operator.js'

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors({
  origin: [process.env.FRONTEND_URL, process.env.ADMIN_URL].filter(Boolean),
  credentials: true,
}))

app.use(express.json())

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'Fit Track API' }))
app.get('/api/classes/:id/ical', getClassIcal)

// 營運方路由（不需要 gym middleware）
app.use('/api/operator', operatorRouter)

// webhook（LINE 自行處理驗證）
app.use('/webhook', webhookRouter)

// 以下路由都需要 x-gym-id
app.use('/api/auth', requireGym, authRouter)
app.use('/api/members', requireGym, memberRouter)
app.use('/api/checkin', requireGym, checkinRouter)
app.use('/api/coach', requireGym, coachRouter)

app.listen(PORT, () => {
  console.log(`Fit Track API running on port ${PORT}`)
})
