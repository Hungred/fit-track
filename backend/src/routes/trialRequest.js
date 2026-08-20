import { Router } from 'express'
import { requireCoach } from '../middlewares/auth.js'
import {
  submitTrialRequest, listTrialRequests, updateTrialRequestStatus,
  deleteTrialRequest, exportTrialRequests,
} from '../controllers/trialRequestController.js'

const router = Router()

// 公開（LIFF 潛在客戶填寫，不需綁定會員）
router.post('/', submitTrialRequest)

// 教練後台
router.use(requireCoach)
router.get('/', listTrialRequests)
router.get('/export', exportTrialRequests)
router.patch('/:id', updateTrialRequestStatus)
router.delete('/:id', deleteTrialRequest)

export default router
