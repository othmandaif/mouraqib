'use client'

import React from 'react'

/**
 * Rendu markdown léger pour les réponses de l'assistant.
 * Gère : **gras**, *italique*, # titres, - listes, `code`, et les sauts de ligne.
 * Pas de lib externe — suffisant pour le chat, et sûr (pas de HTML brut injecté).
 */

const C = { ink2: '#3B4A47', goldD: '#0E5A4E', goldSubtle: '#E3F0EC' }

// Transforme le **gras** et *italique* et `code` d'une ligne en éléments React.
function rendreInline(texte: string, keyBase: string): React.ReactNode[] {
  const noeuds: React.ReactNode[] = []
  // regex : **gras** | *italique* | `code`
  const regex = /(\*\*[^*]+\*\*|==[^=]+==|\*[^*]+\*|`[^`]+`)/g
  const morceaux = texte.split(regex)
  morceaux.forEach((m, i) => {
    if (!m) return
    if (m.startsWith('==') && m.endsWith('==') && m.length > 4) {
      // ==valeur== : champ issu du dossier (aperçu de l'éditeur de documents)
      noeuds.push(<mark key={`${keyBase}-${i}`}>{m.slice(2, -2)}</mark>)
    } else if (m.startsWith('**') && m.endsWith('**')) {
      noeuds.push(<strong key={`${keyBase}-${i}`} style={{ fontWeight: 700, color: C.ink2 }}>{m.slice(2, -2)}</strong>)
    } else if (m.startsWith('`') && m.endsWith('`')) {
      noeuds.push(
        <code key={`${keyBase}-${i}`} style={{ background: C.goldSubtle, borderRadius: 5, padding: '1px 5px', fontFamily: 'monospace', fontSize: '.92em' }}>
          {m.slice(1, -1)}
        </code>,
      )
    } else if (m.startsWith('*') && m.endsWith('*')) {
      noeuds.push(<em key={`${keyBase}-${i}`} style={{ fontStyle: 'italic' }}>{m.slice(1, -1)}</em>)
    } else {
      noeuds.push(<React.Fragment key={`${keyBase}-${i}`}>{m}</React.Fragment>)
    }
  })
  return noeuds
}

export function Markdown({ texte }: { texte: string }) {
  const lignes = texte.split('\n')
  const blocs: React.ReactNode[] = []
  let liste: React.ReactNode[] = []

  const viderListe = (k: string) => {
    if (liste.length) {
      blocs.push(
        <ul key={`ul-${k}`} style={{ margin: '6px 0', paddingInlineStart: 20, listStyle: 'disc' }}>
          {liste}
        </ul>,
      )
      liste = []
    }
  }

  lignes.forEach((ligne, i) => {
    const t = ligne.trim()
    // titres ### ## #
    const titre = t.match(/^(#{1,3})\s+(.*)$/)
    // puces - ou •
    const puce = t.match(/^[-•]\s+(.*)$/)
    // listes numérotées 1. 2.
    const num = t.match(/^\d+\.\s+(.*)$/)

    if (puce) {
      liste.push(<li key={`li-${i}`} style={{ marginBottom: 3, lineHeight: 1.8 }}>{rendreInline(puce[1], `li-${i}`)}</li>)
      return
    }
    viderListe(String(i))

    if (titre) {
      const niveau = titre[1].length
      const taille = niveau === 1 ? 17 : niveau === 2 ? 15.5 : 14.5
      blocs.push(
        <div key={`h-${i}`} style={{ fontWeight: 700, fontSize: taille, color: C.goldD, margin: '10px 0 4px' }}>
          {rendreInline(titre[2], `h-${i}`)}
        </div>,
      )
    } else if (num) {
      blocs.push(
        <div key={`n-${i}`} style={{ margin: '3px 0', lineHeight: 1.8, display: 'flex', gap: 6, flexDirection: 'row-reverse' }}>
          <span>{rendreInline(num[1], `n-${i}`)}</span>
        </div>,
      )
    } else if (t === '') {
      blocs.push(<div key={`sp-${i}`} style={{ height: 6 }} />)
    } else {
      blocs.push(<div key={`p-${i}`} style={{ lineHeight: 1.85, margin: '2px 0' }}>{rendreInline(t, `p-${i}`)}</div>)
    }
  })
  viderListe('end')

  return <div>{blocs}</div>
}