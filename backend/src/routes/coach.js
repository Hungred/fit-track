import { Router } from 'express'
import { getDashboard, getAllCheckins, generateQrToken, getMonthlyReport } from '../controllers/coachController.js'
import { updateCheckin, deleteCheckin } from '../controllers/checkinController.js'
import { getTodayLeaves } from '../controllers/leaveController.js'
import { listPackageTemplates, createPackageTemplate, updatePackageTemplate, deletePackageTemplate, assignPackage, adjustSessions, updateMemberPackage, deleteMemberPackage } from '../controllers/packageController.js'
import { listCoaches, createCoach, updateCoach, deleteCoach } from '../controllers/coachManageController.js'
import { listClasses, getClass, createClass, batchCreateClasses, updateClass, deleteClass } from '../controllers/classController.js'
import { requireCoach, requireOwner } from '../middlewares/auth.js'

const router = Router()

router.use(requireCoach)

router.get('/coaches', listCoaches)
router.post('/coaches', requireOwner, createCoach)
router.patch('/coaches/:id', requireOwner, updateCoach)
router.delete('/coaches/:id', requireOwner, deleteCoach)

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

router.get('/classes', listClasses)
router.post('/classes/batch', batchCreateClasses)
router.post('/classes', createClass)
router.get('/classes/:id', getClass)
router.patch('/classes/:id', updateClass)
router.delete('/classes/:id', deleteClass)

export default router
