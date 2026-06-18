'use client'

import { useState } from 'react'
import { Smartphone, CheckCircle2, ArrowLeft } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

export default function WhatsAppVerificationPage() {
  const { user } = useAuth()
  const [telephone, setTelephone] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState<'phone' | 'code' | 'done'>('phone')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (user?.whatsappVerifie) {
    return (
      <div className="max-w-md space-y-6">
        <PageHeader title="WhatsApp" />
        <Card padding="lg" className="text-center border-success/30 bg-success-bg">
          <CheckCircle2 className="h-12 w-12 text-success mx-auto mb-4" />
          <p className="font-display text-xl font-semibold text-success">WhatsApp vérifié</p>
          <p className="text-sm font-sans text-success mt-1">
            Vous recevrez vos alertes judiciaires sur ce numéro
          </p>
        </Card>
      </div>
    )
  }

  const sendCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await apiFetch('/auth/whatsapp/envoyer-code', { method: 'POST', body: JSON.stringify({ telephone }) })
      setStep('code')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const verifyCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await apiFetch('/auth/whatsapp/verifier-code', { method: 'POST', body: JSON.stringify({ code }) })
      setStep('done')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md space-y-6">
      <PageHeader
        title="Vérification WhatsApp"
        subtitle="Recevez vos alertes judiciaires directement sur WhatsApp"
      />

      {step === 'done' ? (
        <Card padding="lg" className="text-center border-success/30 bg-success-bg">
          <CheckCircle2 className="h-12 w-12 text-success mx-auto mb-4" />
          <p className="font-display text-xl font-semibold text-success">WhatsApp vérifié avec succès !</p>
          <p className="text-sm font-sans text-success mt-1">
            Vous allez recevoir vos alertes judiciaires
          </p>
        </Card>
      ) : step === 'phone' ? (
        <form onSubmit={sendCode}>
          <Card padding="md" className="space-y-4">
            {error && (
              <div className="bg-danger-bg border border-danger/30 text-danger text-sm font-sans px-4 py-3 rounded-sm">
                {error}
              </div>
            )}

            <Input
              label="Numéro WhatsApp"
              type="tel"
              value={telephone}
              onChange={(e) => setTelephone(e.target.value)}
              required
              placeholder="+212 6XX XXX XXX"
            />
            <p className="text-xs text-text-muted font-sans -mt-2">
              Assurez-vous que ce numéro utilise WhatsApp
            </p>

            <Button type="submit" loading={loading} className="w-full">
              <Smartphone className="h-4 w-4" />
              Envoyer le code WhatsApp
            </Button>
          </Card>
        </form>
      ) : (
        <form onSubmit={verifyCode}>
          <Card padding="md" className="space-y-4">
            <div className="bg-accent-subtle border border-accent/30 rounded-sm px-4 py-3 text-sm font-sans text-accent">
              Un code à 6 chiffres a été envoyé sur <strong>{telephone}</strong> via WhatsApp
            </div>

            {error && (
              <div className="bg-danger-bg border border-danger/30 text-danger text-sm font-sans px-4 py-3 rounded-sm">
                {error}
              </div>
            )}

            <Input
              label="Code de vérification"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              maxLength={6}
              placeholder="123456"
              className="text-center text-2xl tracking-widest"
            />

            <Button
              type="submit"
              loading={loading}
              disabled={code.length !== 6}
              className="w-full"
            >
              Vérifier le code
            </Button>

            <Button
              type="button"
              variant="ghost"
              onClick={() => setStep('phone')}
              className="w-full"
            >
              <ArrowLeft className="h-4 w-4" />
              Changer de numéro
            </Button>
          </Card>
        </form>
      )}
    </div>
  )
}
