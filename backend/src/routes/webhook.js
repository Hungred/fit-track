import { Router } from 'express'
import { handleWebhook, verifySignature } from '../controllers/webhookController.js'

const router = Router()

router.post('/', verifySignature, handleWebhook)

export default router
