import { Router } from 'express'
import authRouter from './auth'
import dossiersRouter from './dossiers'
import echeancesRouter from './echeances'
import alertesRouter from './alertes'
import abonnementsRouter from './abonnements'
import dashboardRouter from './dashboard'
import calendrierRouter from './calendrier'
import webhooksRouter from './webhooks'
import adminRouter from './admin'
import assistantRouter from './assistant'
import tribunauxRouter from './tribunaux'
const router = Router()

router.use('/auth', authRouter)
router.use('/dossiers', dossiersRouter)
router.use('/echeances', echeancesRouter)
router.use('/alertes', alertesRouter)
router.use('/abonnements', abonnementsRouter)
router.use('/dashboard', dashboardRouter)
router.use('/calendrier', calendrierRouter)
router.use('/webhooks', webhooksRouter)
router.use('/admin', adminRouter)
router.use('/assistant', assistantRouter)
router.use('/tribunaux', tribunauxRouter)

export default router