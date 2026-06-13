import { Router } from 'express'
import authRouter from './auth'
import dossiersRouter from './dossiers'
import echeancesRouter from './echeances'
import alertesRouter from './alertes'
import abonnementsRouter from './abonnements'

const router = Router()

router.use('/auth', authRouter)
router.use('/dossiers', dossiersRouter)
router.use('/echeances', echeancesRouter)
router.use('/alertes', alertesRouter)
router.use('/abonnements', abonnementsRouter)

export default router
