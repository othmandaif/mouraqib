export function joursRestants(dateLimite: Date): number {
  return Math.ceil((dateLimite.getTime() - Date.now()) / 86_400_000)
}

export function addJours(date: Date, jours: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + jours)
  return d
}

export function formatDateFr(date: Date): string {
  return date.toLocaleDateString('fr-MA', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function formatDateAr(date: Date): string {
  return date.toLocaleDateString('ar-MA', { day: 'numeric', month: 'long', year: 'numeric' })
}

// Converts Arabic-Indic digits (٠-٩) and Persian digits (۰-۹) to ASCII
export function normalizeArabicNumerals(str: string): string {
  return str
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
}

export function parseArabicDate(dateStr: string): Date | null {
  if (!dateStr?.trim()) return null
  const normalized = normalizeArabicNumerals(dateStr).trim()

  const jmA = normalized.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/)
  if (jmA) {
    const d = new Date(`${jmA[3]}-${jmA[2].padStart(2, '0')}-${jmA[1].padStart(2, '0')}`)
    if (!isNaN(d.getTime())) return d
  }

  const amj = normalized.match(/^(\d{4})[\/\-](\d{2})[\/\-](\d{2})$/)
  if (amj) {
    const d = new Date(`${amj[1]}-${amj[2]}-${amj[3]}`)
    if (!isNaN(d.getTime())) return d
  }

  return null
}
