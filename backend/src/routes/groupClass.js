import { Router } from 'express'
import { requireCoach } from '../middlewares/auth.js'
import {
  listGroupClasses, createGroupClass, updateGroupClass, deleteGroupClass,
  listTerms, createTerm, updateTerm, deleteTerm,
  listEnrollments, createEnrollment, updateEnrollment, deleteEnrollment,
  listPublicGroupClasses,
} from '../controllers/groupClassController.js'

const router = Router()

// 公開（LIFF 學員瀏覽 + 報名）
router.get('/public', listPublicGroupClasses)
router.post('/terms/:termId/enroll', createEnrollment)

// 教練後台
router.use(requireCoach)
router.get('/', listGroupClasses)
router.post('/', createGroupClass)
router.patch('/:id', updateGroupClass)
router.delete('/:id', deleteGroupClass)

router.get('/:classId/terms', listTerms)
router.post('/:classId/terms', createTerm)
router.patch('/terms/:termId', updateTerm)
router.delete('/terms/:termId', deleteTerm)

router.get('/terms/:termId/enrollments', listEnrollments)
router.patch('/enrollments/:enrollmentId', updateEnrollment)
router.delete('/enrollments/:enrollmentId', deleteEnrollment)

export default router
