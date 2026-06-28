import { Router } from 'express'
import { getDashboard, getAllCheckins, generateQrToken, getMonthlyReport } from '../controllers/coachController.js'
import { updateCheckin, deleteCheckin } from '../controllers/checkinController.js'
import { getTodayLeaves } from '../controllers/leaveController.js'
import { listPackageTemplates, createPackageTemplate, updatePackageTemplate, deletePackageTemplate, assignPackage, adjustSessions, updateMemberPackage, deleteMemberPackage } from '../controllers/packageController.js'
import { requireCoach } from '../middlewares/auth.js'

const router = Router()

router.use(requireCoach)

router.get('/dashboard', getDashboard)
router.get('/checkins', getAllCheckins)
router.get('/report', getMonthlyReport)
router.get('/leaves', getTodayLeaves)
router.post('/qr-token', generateQrToken)

router.get('/packages', listPackageTemplates)
router.post('/packages', createPackageTemplate)
router.patch('/packages/:id', updatePackageTemplate)
router.delete('/packages/:id', deletePackageTemplate)
router.post('/packages/assign', assignPackage)
router.patch('/member-packages/:id/adjust', adjustSessions)
router.patch('/member-packages/:id', updateMemberPackage)
router.delete('/member-packages/:id', deleteMemberPackage)
router.patch('/checkins/:id', updateCheckin)
router.delete('/checkins/:id', deleteCheckin)

export default router
