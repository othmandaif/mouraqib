'use client'

import { useState } from 'react'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'

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
        <h1 className="text-2xl font-bold text-slate-900">WhatsApp</h1>
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
          <p className="text-4xl mb-3">✅</p>
          <p className="font-semibold text-green-800">WhatsApp vérifié</p>
          <p className="text-sm text-green-600 mt-1">Vous recevrez vos alertes judiciaires sur ce numéro</p>
        </div>
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
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Vérification WhatsApp</h1>
        <p className="text-slate-500 mt-1">Recevez vos alertes judiciaires directement sur WhatsApp</p>
      </div>

      {step === 'done' ? (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
          <p className="text-4xl mb-3">✅</p>
          <p className="font-semibold text-green-800">WhatsApp vérifié avec succès !</p>
          <p className="text-sm text-green-600 mt-1">Vous allez recevoir vos alertes judiciaires</p>
        </div>
      ) : step === 'phone' ? (
        <form onSubmit={sendCode} className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Numéro WhatsApp</label>
            <input
              type="tel"
              value={telephone}
              onChange={(e) => setTelephone(e.target.value)}
              required
              placeholder="+212 6XX XXX XXX"
              className="w-full border border-slate-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-slate-400 mt-1">Assurez-vous que ce numéro utilise WhatsApp</p>
          </div>

          <button type="submit" disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-colors">
            {loading ? 'Envoi en cours...' : '📱 Envoyer le code WhatsApp'}
          </button>
        </form>
      ) : (
        <form onSubmit={verifyCode} className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
            Un code à 6 chiffres a été envoyé sur <strong>{telephone}</strong> via WhatsApp
          </div>

          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Code de vérification</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              maxLength={6}
              placeholder="123456"
              className="w-full border border-slate-300 rounded-lg px-4 py-3 text-center text-2xl tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button type="submit" disabled={loading || code.length !== 6}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-colors">
            {loading ? 'Vérification...' : 'Vérifier le code'}
          </button>

          <button type="button" onClick={() => setStep('phone')}
            className="w-full text-slate-500 hover:text-slate-700 py-2 text-sm">
            ← Changer de numéro
          </button>
        </form>
      )}
    </div>
  )
}
