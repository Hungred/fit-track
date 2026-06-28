import { Router } from 'express'
import { getDashboard, getAllCheckins } from '../controllers/coachController.js'
import { listPackageTemplates, createPackageTemplate, updatePackageTemplate, deletePackageTemplate, assignPackage, adjustSessions } from '../controllers/packageController.js'
import { requireCoach } from '../middlewares/auth.js'

const router = Router()

router.use(requireCoach)

router.get('/dashboard', getDashboard)
router.get('/checkins', getAllCheckins)

router.get('/packages', listPackageTemplates)
router.post('/packages', createPackageTemplate)
router.patch('/packages/:id', updatePackageTemplate)
router.delete('/packages/:id', deletePackageTemplate)
router.post('/packages/assign', assignPackage)
router.patch('/member-packages/:id/adjust', adjustSessions)

export default router
