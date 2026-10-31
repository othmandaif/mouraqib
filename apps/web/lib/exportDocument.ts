'use client'

// Export d'un document juridique en .docx (Word), RTL arabe + conversion Markdown.
// Lib: npm i docx file-saver ; npm i -D @types/file-saver

interface ExportParams {
  titre: string
  contenu: string
  langue?: 'AR' | 'FR'
}

// Découpe une ligne en segments gras/normal selon le markdown **gras**.
function segmentsMarkdown(ligne: string): { texte: string; gras: boolean }[] {
  const out: { texte: string; gras: boolean }[] = []
  const regex = /\*\*(.+?)\*\*/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = regex.exec(ligne)) !== null) {
    if (m.index > last) out.push({ texte: ligne.slice(last, m.index), gras: false })
    out.push({ texte: m[1], gras: true })
    last = m.index + m[0].length
  }
  if (last < ligne.length) out.push({ texte: ligne.slice(last), gras: false })
  if (out.length === 0) out.push({ texte: ligne, gras: false })
  return out
}

// ════════════════════════════════════════════════════════════════════
//  Export .doc via HTML (méthode FIABLE pour le RTL arabe).
//  Word ouvre parfaitement un fichier HTML avec dir="rtl" — pas de bug
//  d'alignement comme avec la lib docx (issue #3419).
// ════════════════════════════════════════════════════════════════════
export function exporterWordHtml({ titre, contenu, langue = 'AR' }: ExportParams): void {
  const rtl = langue === 'AR' || /[\u0600-\u06FF]/.test(contenu + ' ' + titre)
  const corps = contenu.split('\n').map((l) => {
    const h = l.match(/^(#{1,3})\s+(.*)$/)
    if (h) return `<h${h[1].length}>${escapeHtml(h[2].replace(/\*\*/g, ''))}</h${h[1].length}>`
    const html = escapeHtml(l)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/^\s*[-*•]\s+(.*)$/, '• $1')
    return `<p>${html}</p>`
  }).join('')

  // En-tête Word + HTML avec direction forcée à droite.
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8">
<style>
  @page { margin: 2.5cm; }
  body { font-family: 'Arial',sans-serif; font-size: 13pt; line-height: 1.9; color: #1a1a1a; direction: ${rtl ? 'rtl' : 'ltr'}; text-align: ${rtl ? 'right' : 'left'}; }
  h1 { text-align: center; font-size: 18pt; margin-bottom: 1.4em; direction: ${rtl ? 'rtl' : 'ltr'}; }
  h2,h3 { font-size: 14pt; margin: 1em 0 .4em; direction: ${rtl ? 'rtl' : 'ltr'}; text-align: ${rtl ? 'right' : 'left'}; }
  p { margin: 0 0 .55em; direction: ${rtl ? 'rtl' : 'ltr'}; text-align: ${rtl ? 'right' : 'left'}; }
</style></head>
<body><h1>${escapeHtml(titre.replace(/\*\*/g, ''))}</h1>${corps}</body></html>`

  const blob = new Blob(['\ufeff', html], { type: 'application/msword' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${nettoyerNom(titre)}.doc`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export async function exporterDocx({ titre, contenu, langue = 'AR' }: ExportParams): Promise<void> {
  const contientArabe = /[\u0600-\u06FF]/.test(contenu + ' ' + titre)
  const rtl = langue === 'AR' || contientArabe
  try {
    const docx = await import('docx')
    const { saveAs } = await import('file-saver')
    const { Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel } = docx as any

    const align = rtl ? AlignmentType.RIGHT : AlignmentType.LEFT

    const lignes = contenu.split('\n')
    const paragraphes: any[] = []

    for (let ligne of lignes) {
      // Titres markdown (#, ##, ###)
      const hMatch = ligne.match(/^(#{1,3})\s+(.*)$/)
      if (hMatch) {
        const niveau = hMatch[1].length
        paragraphes.push(new Paragraph({
          bidirectional: rtl,
          alignment: align,
          heading: niveau === 1 ? HeadingLevel.HEADING_1 : niveau === 2 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3,
          spacing: { before: 200, after: 120 },
          children: [new TextRun({ text: hMatch[2].replace(/\*\*/g, ''), bold: true, rightToLeft: rtl, font: 'Arial', size: 28 })],
        }))
        continue
      }

      // Puces markdown (-, *, •)
      let puce = false
      const pMatch = ligne.match(/^\s*[-*•]\s+(.*)$/)
      if (pMatch) { puce = true; ligne = pMatch[1] }

      // Segments gras/normal
      const segs = segmentsMarkdown(ligne)
      const runs = segs.map((s, i) => new TextRun({
        text: (puce && i === 0 ? '• ' : '') + s.texte,
        bold: s.gras,
        rightToLeft: rtl,
        font: 'Arial',
        size: 24,
      }))

      paragraphes.push(new Paragraph({
        bidirectional: rtl,
        alignment: align,
        spacing: { after: 120, line: 320 },
        children: runs,
      }))
    }

    const titrePara = new Paragraph({
      bidirectional: rtl,
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
      children: [new TextRun({ text: titre.replace(/\*\*/g, ''), bold: true, rightToLeft: rtl, font: 'Arial', size: 32 })],
    })

    const doc = new Document({
      sections: [{
        properties: { bidi: rtl },
        children: [titrePara, ...paragraphes],
      }],
    })

    const blob = await Packer.toBlob(doc)
    saveAs(blob, `${nettoyerNom(titre)}.docx`)
  } catch (err) {
    console.warn('Lib docx indisponible, fallback impression:', err)
    exporterImpression({ titre, contenu, langue })
  }
}

// Fallback HTML imprimable : convertit aussi le markdown de base.
export function exporterImpression({ titre, contenu, langue = 'AR' }: ExportParams): void {
  const rtl = langue === 'AR' || /[\u0600-\u06FF]/.test(contenu)
  const w = window.open('', '_blank')
  if (!w) return
  const corps = contenu.split('\n').map((l) => {
    const h = l.match(/^(#{1,3})\s+(.*)$/)
    if (h) return `<h${h[1].length}>${escapeHtml(h[2].replace(/\*\*/g, ''))}</h${h[1].length}>`
    const html = escapeHtml(l).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/^\s*[-*•]\s+(.*)$/, '• $1')
    return `<p>${html}</p>`
  }).join('')
  const html = `<!DOCTYPE html><html dir="${rtl ? 'rtl' : 'ltr'}" lang="${rtl ? 'ar' : 'fr'}">
<head><meta charset="utf-8"><title>${escapeHtml(titre)}</title>
<style>
  @page { margin: 2.5cm; }
  body { font-family: 'Arial',serif; font-size: 13pt; line-height: 1.9; color: #1a1a1a; direction: ${rtl ? 'rtl' : 'ltr'}; text-align: ${rtl ? 'right' : 'left'}; }
  h1 { text-align: center; font-size: 18pt; margin-bottom: 1.5em; }
  h2,h3 { font-size: 14pt; margin: 1em 0 .4em; }
  p { margin: 0 0 .6em; white-space: pre-wrap; }
</style></head>
<body><h1>${escapeHtml(titre.replace(/\*\*/g, ''))}</h1>${corps}
<script>window.onload=function(){window.print()}</script>
</body></html>`
  w.document.write(html)
  w.document.close()
}

function nettoyerNom(s: string): string {
  return (s || 'document').replace(/[\\/:*?"<>|]/g, '').slice(0, 60).trim() || 'document'
}
function escapeHtml(s: string): string {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}