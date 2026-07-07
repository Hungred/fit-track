import { Router } from 'express'
import { requireCoach } from '../middlewares/auth.js'
import {
  listSpaces, createSpace, updateSpace, deleteSpace,
  listBookings, createBooking, updateBooking, deleteBooking,
} from '../controllers/spaceController.js'

const router = Router()

// 場地（管理員才能 CRUD，LIFF 只能讀）
router.get('/', listSpaces)
router.post('/', requireCoach, createSpace)
router.patch('/:id', requireCoach, updateSpace)
router.delete('/:id', requireCoach, deleteSpace)

// 預約（LIFF 可建立，管理員可查閱/更新/刪除）
router.get('/bookings', requireCoach, listBookings)
router.post('/bookings', createBooking)
router.patch('/bookings/:id', requireCoach, updateBooking)
router.delete('/bookings/:id', requireCoach, deleteBooking)

export default router
