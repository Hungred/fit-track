import { Router } from 'express'
import { operatorLogin, listGyms, getGym, createGym, updateGym, deleteGym } from '../controllers/gymController.js'
import { requireOperator } from '../middlewares/gym.js'

const router = Router()

router.post('/login', operatorLogin)

router.use(requireOperator)
router.get('/gyms', listGyms)
router.get('/gyms/:id', getGym)
router.post('/gyms', createGym)
router.patch('/gyms/:id', updateGym)
router.delete('/gyms/:id', deleteGym)

export default router
