import { Router } from 'express'
import { checkin, manualCheckin } from '../controllers/checkinController.js'
import { requireMember, requireCoach } from '../middlewares/auth.js'

const router = Router()

router.post('/', requireMember, checkin)
router.post('/manual', requireCoach, manualCheckin)

export default router
