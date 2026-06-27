import { Router } from 'express'
import { bindMember, getMe, getCheckinHistory } from '../controllers/memberController.js'
import { requireMember } from '../middlewares/auth.js'

const router = Router()

router.post('/bind', bindMember)
router.get('/me', requireMember, getMe)
router.get('/me/checkins', requireMember, getCheckinHistory)

export default router
