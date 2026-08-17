import { Router } from 'express'
import { useBindToken } from '../controllers/coachManageController.js'

const router = Router()

router.post('/', useBindToken)

export default router
