import { Router } from 'express'
import { sendClassReminders } from '../controllers/notifyController.js'

const router = Router()
router.get('/class-reminders', sendClassReminders)
export default router
