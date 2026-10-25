// Archive .zip minimale (fichiers stockés sans compression), sans dépendance : suffit pour regrouper des .doc.
// Format : en-têtes locaux + répertoire central + fin de répertoire (APPNOTE 4.3). Noms en UTF-8 (bit 11).

const TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0 }
  return t
})()
function crc32(d: Uint8Array): number {
  let c = 0xffffffff
  for (let i = 0; i < d.length; i++) c = TABLE[(c ^ d[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

export function creerZip(fichiers: { nom: string; contenu: string | Uint8Array }[]): Blob {
  const enc = new TextEncoder()
  const morceaux: Uint8Array[] = []
  const central: Uint8Array[] = []
  let decalage = 0
  const d = new Date()
  const heure = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1)
  const jour = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()

  for (const f of fichiers) {
    const nom = enc.encode(f.nom)
    const data = typeof f.contenu === 'string' ? enc.encode(f.contenu) : f.contenu
    const crc = crc32(data)
    const local = new DataView(new ArrayBuffer(30))
    local.setUint32(0, 0x04034b50, true); local.setUint16(4, 20, true); local.setUint16(6, 0x0800, true); local.setUint16(8, 0, true)
    local.setUint16(10, heure, true); local.setUint16(12, jour, true); local.setUint32(14, crc, true)
    local.setUint32(18, data.length, true); local.setUint32(22, data.length, true); local.setUint16(26, nom.length, true); local.setUint16(28, 0, true)
    morceaux.push(new Uint8Array(local.buffer), nom, data)

    const c = new DataView(new ArrayBuffer(46))
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, 0, true)
    c.setUint16(12, heure, true); c.setUint16(14, jour, true); c.setUint32(16, crc, true); c.setUint32(20, data.length, true); c.setUint32(24, data.length, true)
    c.setUint16(28, nom.length, true); c.setUint16(30, 0, true); c.setUint16(32, 0, true); c.setUint16(34, 0, true); c.setUint16(36, 0, true)
    c.setUint32(38, 0, true); c.setUint32(42, decalage, true)
    central.push(new Uint8Array(c.buffer), nom)
    decalage += 30 + nom.length + data.length
  }
  const tailleCentral = central.reduce((s, x) => s + x.length, 0)
  const fin = new DataView(new ArrayBuffer(22))
  fin.setUint32(0, 0x06054b50, true); fin.setUint16(8, fichiers.length, true); fin.setUint16(10, fichiers.length, true)
  fin.setUint32(12, tailleCentral, true); fin.setUint32(16, decalage, true)
  return new Blob([...morceaux, ...central, new Uint8Array(fin.buffer)] as BlobPart[], { type: 'application/zip' })
}

export function telecharger(blob: Blob, nom: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = nom
  document.body.appendChild(a); a.click(); document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
