import { Router } from 'express'
import { handleWebhook } from '../controllers/webhookController.js'

const router = Router()

router.post('/:gymId', handleWebhook)

export default router
