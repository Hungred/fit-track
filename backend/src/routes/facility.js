import { Router } from 'express'
import { listFacilityPhotos } from '../controllers/facilityController.js'

const router = Router()

// 公開（LIFF 場地介紹頁，不需綁定會員）
router.get('/', listFacilityPhotos)

export default router
