import { describe, it, expect, vi, afterEach } from 'vitest'
vi.mock('../../../utils/logger', () => ({ logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() } }))
import { envoyerEmail, messageCodeReinitialisation } from '../emailService'

describe('emailService', () => {
  afterEach(() => { delete process.env.RESEND_API_KEY; delete process.env.EMAIL_FROM; vi.unstubAllGlobals() })

  it("n'envoie rien sans configuration Resend", async () => {
    const f = vi.fn(); vi.stubGlobal('fetch', f)
    expect(await envoyerEmail({ to: 'a@gmail.com', subject: 's', html: 'h', text: 't' })).toBe(false)
    expect(f).not.toHaveBeenCalled()
  })

  it('appelle Resend avec la clé et l’expéditeur', async () => {
    process.env.RESEND_API_KEY = 're_test'; process.env.EMAIL_FROM = 'MalafiPro <noreply@malafipro.ma>'
    const f = vi.fn().mockResolvedValue({ ok: true }); vi.stubGlobal('fetch', f)
    expect(await envoyerEmail({ to: 'a@gmail.com', subject: 's', html: 'h', text: 't' })).toBe(true)
    const [url, opts] = f.mock.calls[0]
    expect(url).toBe('https://api.resend.com/emails')
    expect(opts.headers.Authorization).toBe('Bearer re_test')
    expect(JSON.parse(opts.body)).toMatchObject({ from: 'MalafiPro <noreply@malafipro.ma>', to: ['a@gmail.com'] })
  })

  it('le message contient le code lisible et échappe le prénom', () => {
    const m = messageCodeReinitialisation('<b>Sara</b>', '123456')
    expect(m.html).toContain('123 456')
    expect(m.html).not.toContain('<b>Sara</b>')
    expect(m.text).toContain('123 456')
  })
})
