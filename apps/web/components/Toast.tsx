'use client'

import { t as tr } from '@/lib/langue'
import { useState, createContext, useContext, useCallback } from 'react'
import { Check, AlertCircle, Info, X } from 'lucide-react'

type ToastType = 'success' | 'error' | 'info' | 'warning'
interface ToastAction { label: string; onClick: () => void }

interface Toast {
  id: string
  message: string
  type: ToastType
  action?: ToastAction
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType, action?: ToastAction) => void
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} })

// Bandeau Encre (design V2) ; seule l'icône change selon le type.
const ICON: Record<ToastType, { Icon: typeof Check; color: string }> = {
  success: { Icon: Check, color: '#9FC9BE' },
  info: { Icon: Info, color: '#9FC9BE' },
  warning: { Icon: AlertCircle, color: '#F2A93B' },
  error: { Icon: AlertCircle, color: '#F0A79C' },
}

export const TOAST_MS = 5000

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const remove = (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id))

  const toast = useCallback((message: string, type: ToastType = 'info', action?: ToastAction) => {
    const id = crypto.randomUUID()
    setToasts((prev) => [...prev, { id, message, type, action }])
    setTimeout(() => remove(id), TOAST_MS)
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div role="status" aria-live="polite" style={{ position: 'fixed', bottom: 88, left: '50%', transform: 'translateX(-50%)', zIndex: 60, display: 'flex', flexDirection: 'column', gap: 8, width: 'max-content', maxWidth: 'calc(100vw - 32px)' }}>
        {toasts.map((t) => {
          const { Icon, color } = ICON[t.type]
          return (
            <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#15201E', color: '#FFFFFF', borderRadius: 14, paddingBlock: 6, paddingInlineStart: 6, paddingInlineEnd: 16, boxShadow: '0 20px 40px -20px rgba(0,0,0,.6)', fontSize: 14 }}>
              <Icon size={18} color={color} aria-hidden style={{ marginRight: 10, flex: 'none' }} />
              <span style={{ flex: 1 }}>{tr(t.message)}</span>
              {t.action && (
                <button onClick={() => { t.action!.onClick(); remove(t.id) }} style={{ fontFamily: 'inherit', fontSize: 14, fontWeight: 700, background: 'transparent', color: '#F2A93B', border: 0, padding: '0 12px', minHeight: 44, cursor: 'pointer' }}>
                  {tr(t.action.label)}
                </button>
              )}
              <button onClick={() => remove(t.id)} aria-label={tr('إغلاق')} style={{ width: 44, height: 44, background: 'transparent', border: 0, color: '#9FC9BE', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={16} aria-hidden />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}

/**
 * Action destructive avec « تراجع » (5 s) au lieu d'une fenêtre de confirmation : l'élément disparaît tout
 * de suite, la requête part à la fin du délai, sauf si l'utilisateur annule. En cas d'échec, il réapparaît.
 */
export function useActionAnnulable() {
  const { toast } = useToast()
  const [masques, setMasques] = useState<Set<string>>(() => new Set())
  const reafficher = (ids: string[]) => setMasques((m) => { const n = new Set(m); ids.forEach((i) => n.delete(i)); return n })
  const differer = useCallback((ids: string[], message: string, executer: () => Promise<unknown>, apres?: () => void) => {
    setMasques((m) => new Set([...m, ...ids]))
    let annule = false
    toast(message, 'info', { label: 'تراجع', onClick: () => { annule = true; reafficher(ids) } })
    setTimeout(async () => {
      if (annule) return
      try { await executer(); apres?.() } catch { reafficher(ids); toast('تعذّر تنفيذ العملية. أعيدوا المحاولة.', 'error') }
    }, TOAST_MS)
  }, [toast])
  return { masques, differer }
}
