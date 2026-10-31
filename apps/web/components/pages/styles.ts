// Styles des pages « fonction » et de la section « en détail » de la landing. S'ajoutent à CSS (components/landing/styles.ts),
// dont ils réutilisent les classes lp-* ; propriétés logiques : valable en RTL et en LTR.
export const CSS_PAGE = `
.pg-hero{padding-bottom:56px}
.pg-corps{display:flex;flex-direction:column;gap:18px;padding-top:28px;max-width:820px}
.pg-nav{display:flex;gap:16px}
.pg-nav a{color:#CFE5DD;font-size:14px;font-weight:500;min-height:44px;display:inline-flex;align-items:center}
.pg-nav a:hover{color:#FFFFFF}
.pg-fil{display:flex;flex-wrap:wrap;gap:6px;align-items:center;font-size:14px;color:#CFE5DD;margin:0;padding:0;list-style:none}
.pg-fil a{color:#E3F0EC;text-decoration:underline;text-underline-offset:3px}
.pg-main{padding-top:56px;padding-bottom:40px}
.pg-article{display:flex;flex-direction:column;gap:56px}
.pg-bloc{display:flex;flex-direction:column;gap:18px}
.pg-h2{margin:0;font-size:28px;font-weight:700;line-height:1.35;color:#083B34;text-wrap:balance}
.pg-texte{margin:0;font-size:17px;line-height:1.9;color:#3B4A47;max-width:780px}
.pg-grille{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
.pg-carte{background:#FFFFFF;border:1px solid #E4E0D6;border-radius:16px;padding:20px;display:flex;flex-direction:column;gap:8px;box-shadow:0 10px 30px -24px rgba(8,59,52,.35)}
.pg-carte h3{margin:0;font-size:18px;font-weight:600;color:#083B34;line-height:1.5}
.pg-carte p{margin:0;font-size:15px;line-height:1.85;color:#3B4A47}
.pg-puces{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:10px;max-width:780px}
.pg-puces li{display:flex;gap:10px;align-items:flex-start;font-size:16px;line-height:1.85;color:#3B4A47}
.pg-puces svg{flex:none;margin-top:7px}
.pg-fig{margin:0;max-width:520px;background:#FFFFFF;border:1px solid #E4E0D6;border-radius:20px;padding:12px;display:flex;flex-direction:column;gap:10px;box-shadow:0 30px 60px -40px rgba(8,59,52,.5)}
.pg-fig img{display:block;width:100%;height:auto;border-radius:12px;border:1px solid #EEEAE1}
.pg-fig figcaption{font-size:15px;font-weight:600;text-align:center}
.pg-limites{background:#FDF8EC;border:1px solid #F2D49C;border-radius:16px;padding:24px;display:flex;flex-direction:column;gap:14px}
.pg-limites .pg-h2{color:#7A4E06}
.pg-limites .pg-puces svg{color:#7A4E06}
.pg-voir{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}
.pg-lien-carte{display:flex;flex-direction:column;gap:6px;padding:18px 20px;background:#FFFFFF;border:1px solid #E4E0D6;border-radius:16px;min-height:44px;transition:border-color .15s,transform .15s}
.pg-lien-carte:hover{border-color:#0E5A4E;transform:translateY(-1px)}
.pg-lien-carte strong{font-size:17px;color:#083B34;line-height:1.5}
.pg-lien-carte span{font-size:15px;line-height:1.75;color:#3B4A47}
.pg-lien-carte em{font-style:normal;font-size:14px;font-weight:600;color:#0E5A4E;display:inline-flex;align-items:center;gap:6px;margin-top:4px}
.pg-hub{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}
.pg-cta{margin:0}
@media (max-width:1240px){.pg-nav{display:none}}
@media (max-width:1080px){.pg-voir,.pg-hub{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:760px){
  .pg-main{padding-top:36px}.pg-article{gap:40px}
  .pg-grille,.pg-voir,.pg-hub{grid-template-columns:1fr}
  .pg-h2{font-size:24px}.pg-texte{font-size:16px}
  .pg-hero{padding-bottom:40px}.pg-limites{padding:18px}
}
@media (prefers-reduced-motion:reduce){.pg-lien-carte{transition:none}.pg-lien-carte:hover{transform:none}}
`
