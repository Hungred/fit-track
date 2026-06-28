import { Router } from 'express'
import { bindMember, getMe, getCheckinHistory } from '../controllers/memberController.js'
import { requestLeave, cancelLeave, getMyLeaves } from '../controllers/leaveController.js'
import { requireMember } from '../middlewares/auth.js'

const router = Router()

router.post('/bind', bindMember)
router.get('/me', requireMember, getMe)
router.get('/me/checkins', requireMember, getCheckinHistory)
router.get('/me/leaves', requireMember, getMyLeaves)
router.post('/me/leave', requireMember, requestLeave)
router.delete('/me/leave', requireMember, cancelLeave)

export default router
