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
import documentsRouter from './documents'
import clientsRouter from './clients'
import facturationRouter from './facturation'
import { requireAuth, exigerDroit } from '../middleware/auth'

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
router.use('/assistant', requireAuth, exigerDroit('IA'), assistantRouter)
router.use('/tribunaux', tribunauxRouter)
router.use('/documents', requireAuth, exigerDroit('IA'), documentsRouter)
// Droits accordés par le responsable du cabinet
router.use('/clients', requireAuth, exigerDroit('CRM'), clientsRouter)
router.use('/facturation', requireAuth, exigerDroit('FACTURATION'), facturationRouter)

export default router