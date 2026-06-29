import { Router } from 'express'
import { adminLogin, changePassword } from '../controllers/authController.js'
import { requireCoach } from '../middlewares/auth.js'

const router = Router()

router.post('/login', adminLogin)
router.post('/change-password', requireCoach, changePassword)

export default router
