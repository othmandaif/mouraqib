// Styles de la landing (tokens V2 : claude/DESIGN_UI_MALAFIPRO.md). Propriétés logiques (inline-start/end) : marche en RTL et LTR.
export const CSS = `
.lp a{text-decoration:none;color:inherit}
.lp{overflow-x:hidden;overflow-x:clip} /* hidden : Safari < 16 ne connaît pas clip */
.lp *,.lp *::before,.lp *::after{box-sizing:border-box}
.lp h3{color:inherit}
.lp[lang=fr] h1,.lp[lang=fr] h2,.lp[lang=fr] h3{font-family:'IBM Plex Sans','IBM Plex Sans Arabic',sans-serif}
.lp .num{font-family:'IBM Plex Sans',sans-serif;font-variant-numeric:tabular-nums;direction:ltr;unicode-bidi:isolate}
.lp a:focus-visible,.lp button:focus-visible,.lp summary:focus-visible{outline:none;box-shadow:0 0 0 4px #CDE5DD;border-radius:12px}
.lp-wrap{max-width:1180px;margin:0 auto;width:100%}
.lp-sec{padding-left:24px;padding-right:24px}
.lp-bloc{padding-top:88px;padding-bottom:88px;scroll-margin-top:16px}
.lp-titre{display:flex;flex-direction:column;gap:12px;align-items:center;text-align:center}
.lp-h1{margin:0;font-size:48px;line-height:1.25;text-wrap:balance;font-weight:700;color:#FFFFFF;letter-spacing:-.01em}
.lp[lang=ar] .lp-h1,.lp[lang=ar] .lp-h2{letter-spacing:0}
.lp-h2{margin:0;font-size:38px;font-weight:700;line-height:1.3;color:#083B34;text-wrap:balance}
.lp-lead{margin:0;font-size:18px;color:#3B4A47;line-height:1.8;max-width:680px}
.lp-sous{margin:0;font-size:19px;line-height:1.85;color:#CFE5DD;max-width:580px}
.lp-pastille{font-size:13px;font-weight:600;border-radius:999px;padding:6px 14px;background:#E3F0EC;color:#0B4A40}
.lp-pastille.sombre{background:rgba(255,255,255,.1);color:#E3F0EC;border:1px solid rgba(255,255,255,.2)}
.lp-bientot{display:inline-flex;align-items:center;font-size:12px;font-weight:700;border-radius:999px;padding:2px 10px;background:#FDF1DC;color:#7A4E06;border:1px solid #F2D49C;white-space:nowrap}

/* Boutons */
.lp-btn{display:inline-flex;align-items:center;justify-content:center;gap:10px;font-size:16px;font-weight:600;border-radius:999px;padding:0 24px;min-height:52px;transition:transform .15s,box-shadow .15s,background-color .15s;cursor:pointer;border:0}
.lp-btn:hover{transform:translateY(-1px)}
.lp-btn.action{background:var(--mp-action);color:var(--mp-action-texte);box-shadow:0 12px 24px -14px rgba(156,82,10,.75)}
.lp-btn.fantome{background:rgba(255,255,255,.08);color:#FFFFFF;border:1px solid rgba(255,255,255,.35)}
.lp-btn.fantome:hover{background:rgba(255,255,255,.14)}
.lp-btn.contour{background:#FFFFFF;color:#083B34;border:1.5px solid #0E5A4E}
.lp-lien{display:inline-flex;align-items:center;gap:8px;color:#0E5A4E;font-weight:600;min-height:44px;border-bottom:1.5px solid #9FC9BE}

/* Hero */
.lp-hero{position:relative;overflow:hidden;background:radial-gradient(1100px 560px at 85% -10%,#12705F 0%,#0A4A40 45%,#083B34 75%);color:#E3F0EC;border-radius:0 0 40px 40px;padding-bottom:96px}
.lp-grille-fond{position:absolute;inset:0;background-image:linear-gradient(rgba(159,224,198,.07) 1px,transparent 1px),linear-gradient(90deg,rgba(159,224,198,.07) 1px,transparent 1px);background-size:48px 48px;mask-image:radial-gradient(ellipse 70% 60% at 50% 30%,#000 30%,transparent 80%);-webkit-mask-image:radial-gradient(ellipse 70% 60% at 50% 30%,#000 30%,transparent 80%)}
.lp-barre{display:flex;align-items:center;justify-content:space-between;gap:16px;min-height:76px}
.lp-nav{display:flex;gap:22px}
.lp-nav a{color:#CFE5DD;font-size:15px;font-weight:500;min-height:44px;display:inline-flex;align-items:center}
.lp-nav a:hover{color:#FFFFFF}
.lp-langue,.lp-connexion{display:inline-flex;align-items:center;gap:8px;font-size:15px;font-weight:600;color:#FFFFFF;border:1px solid rgba(255,255,255,.35);border-radius:999px;padding:0 14px;min-height:44px}
.lp-langue:hover,.lp-connexion:hover{background:rgba(255,255,255,.1)}
.lp-langue-court{display:none}
.lp-hero-grille{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,.95fr);gap:56px;align-items:center;padding-top:36px}
.lp-pastille-hero{display:inline-flex;align-items:center;gap:10px;font-size:14px;font-weight:600;background:rgba(255,255,255,.08);color:#E3F0EC;border:1px solid rgba(255,255,255,.2);border-radius:999px;padding:7px 14px}
.lp-point{width:8px;height:8px;border-radius:50%;background:#9FE0C6;box-shadow:0 0 0 0 rgba(159,224,198,.6);animation:lp-pouls 2s infinite}
@keyframes lp-pouls{70%{box-shadow:0 0 0 10px rgba(159,224,198,0)}100%{box-shadow:0 0 0 0 rgba(159,224,198,0)}}
.lp-confiance{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:8px 20px}
.lp-confiance li{display:flex;align-items:center;gap:8px;font-size:14px;color:#CFE5DD}

/* Maquette du hero */
.lp-mock-zone{position:relative;padding-bottom:70px;min-width:0}
.lp-mock{background:#F5F3EE;color:#15201E;border-radius:22px;padding:16px 18px 18px;display:flex;flex-direction:column;gap:12px;box-shadow:0 40px 80px -40px rgba(0,0,0,.75),0 0 0 1px rgba(255,255,255,.08)}
.lp-mock-barre{display:flex;gap:6px}.lp-mock-barre span{width:10px;height:10px;border-radius:50%;background:#DCD7CC}
.lp-rond{width:34px;height:34px;border-radius:50%;background:#E3F0EC;color:#0E5A4E;display:inline-flex;align-items:center;justify-content:center;flex:none}
.lp-mock-acte{background:#FFFFFF;border:1px solid #E4E0D6;border-radius:12px;padding:10px 12px;font-size:13px;line-height:1.7;color:#3B4A47;font-family:'IBM Plex Sans Arabic',sans-serif}
.lp-puce{display:inline-flex;align-items:center;gap:6px;border-radius:999px;padding:4px 10px;font-weight:600}
.lp-puce.menthe{background:#E3F0EC;color:#0B4A40}
.lp-puce.ambre{background:#F2A93B;color:#15201E;font-weight:700}
.lp-puce.neutre{background:#F1EFEA;color:#3B4A47;font-weight:500}
.lp-mock-delais{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.lp-mock-delais>div{display:flex;gap:10px;align-items:center;border-radius:14px;padding:10px;background:#FFFFFF;font-size:13px}
.lp-mock-delais strong{display:block;font-size:14px}.lp-mock-delais small{display:block;color:#5E6B67}
.lp-mock-delais .agir{border:1.5px solid #C0392B}
.lp-mock-delais .surv{border:1.5px dashed #8C877C;color:#4D5B57}
.lp-compte{width:46px;height:46px;border-radius:12px;background:#C0392B;color:#FFFFFF;display:inline-flex;flex-direction:column;align-items:center;justify-content:center;line-height:1;flex:none}
.lp-compte b{font-size:20px}.lp-compte small{font-size:10px;color:#FFFFFF !important}
.lp-bulle{max-width:90%;border-radius:14px;padding:8px 12px;font-size:13px;line-height:1.7}
.lp-bulle.q{align-self:flex-start;background:#083B34;color:#FFFFFF}
.lp-bulle.r{align-self:flex-end;background:#FFFFFF;border:1px solid #E4E0D6;display:flex;gap:8px}
.lp-source{display:inline-block;margin-inline-start:6px;font-size:11px;color:#0E5A4E;background:#E3F0EC;border-radius:999px;padding:1px 8px}
.lp-wa-carte{background:#FFFFFF;color:#15201E;border-radius:16px;padding:12px 14px;display:flex;gap:10px;align-items:flex-start;box-shadow:0 24px 48px -20px rgba(0,0,0,.6)}
.lp-wa-rond{flex:none;width:34px;height:34px;border-radius:50%;background:#0E5A4E;color:#FFFFFF;display:inline-flex;align-items:center;justify-content:center}

/* Problèmes → solutions */
.lp-paires{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px}
.lp-paire{display:flex;flex-direction:column;border-radius:20px;overflow:hidden;background:#FFFFFF;border:1px solid #E4E0D6;box-shadow:0 10px 30px -24px rgba(8,59,52,.35);transition:transform .2s,box-shadow .2s}
.lp-paire:hover{transform:translateY(-3px);box-shadow:0 22px 40px -26px rgba(8,59,52,.45)}
.lp-paire strong{display:block;font-size:16px;font-weight:700;line-height:1.5}
.lp-paire .d{display:block;font-size:14px;line-height:1.7}
.lp-paire-pb{padding:18px 18px 16px;display:flex;flex-direction:column;gap:6px;background:#FAF8F4;flex:1}
.lp-paire-pb .d{color:#5E6B67}
.lp-paire-sol{padding:16px 18px 18px;display:flex;flex-direction:column;gap:6px;background:#E3F0EC;border-top:1px dashed #9FC9BE}
.lp-paire-sol strong{color:#083B34}.lp-paire-sol .d{color:#0B4A40}
.lp-paire-ico{width:40px;height:40px;border-radius:12px;background:#FFFFFF;border:1px solid #E4E0D6;color:#4D5B57;display:inline-flex;align-items:center;justify-content:center;margin-bottom:4px}
.lp-mot{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:700;flex-wrap:wrap}
.lp-mot.pb{color:#9B2C20}.lp-mot.sol{color:#0E5A4E}

/* Bento des fonctions + bordure lumineuse */
.lp-bento{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}
.lp-bento>.large{grid-column:span 1}
.lp-lumiere{position:relative;isolation:isolate;height:100%}
.lp-lumiere::before{content:'';position:absolute;inset:-1px;border-radius:inherit;padding:1.5px;background:radial-gradient(260px circle at var(--x,50%) var(--y,0%),#2E8B6E,transparent 60%);-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude;opacity:0;transition:opacity .3s;pointer-events:none;z-index:-1}
.lp-lumiere::after{content:'';position:absolute;inset:0;border-radius:inherit;background:radial-gradient(320px circle at var(--x,50%) var(--y,0%),rgba(46,139,110,.07),transparent 60%);opacity:0;transition:opacity .3s;pointer-events:none}
.lp-lumiere:hover::before,.lp-lumiere:hover::after{opacity:1}
.lp-fn{background:#FFFFFF;border:1px solid #E4E0D6;border-radius:20px;padding:22px;display:flex;flex-direction:column;gap:10px;box-shadow:0 10px 30px -24px rgba(8,59,52,.35)}
.lp-fn h3{margin:4px 0 0;font-size:18px;font-weight:700}
.lp-fn p{margin:0;font-size:15px;color:#3B4A47;line-height:1.75}
.lp-fn-ico{flex:none;width:46px;height:46px;border-radius:14px;background:#E3F0EC;color:#0E5A4E;display:inline-flex;align-items:center;justify-content:center}

/* CRM */
.lp-crm{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:40px;align-items:center;background:radial-gradient(700px 360px at 0% 100%,#0E5A4E 0%,#083B34 70%);border-radius:28px;padding:44px}
.lp-liste-claire{list-style:none;margin:0;padding:0;display:grid;gap:10px}
.lp-liste-claire li{display:flex;gap:10px;align-items:flex-start;font-size:15px;line-height:1.7;color:#E3F0EC}
.lp-liste-claire svg{flex:none;margin-top:5px;color:#9FE0C6}
.lp-fiche{background:#F5F3EE;border-radius:22px;padding:20px;display:flex;flex-direction:column;gap:14px;box-shadow:0 30px 60px -30px rgba(0,0,0,.6)}
.lp-avatar{width:48px;height:48px;border-radius:14px;background:#0E5A4E;color:#FFFFFF;display:inline-flex;align-items:center;justify-content:center;font-weight:700;font-size:20px;flex:none}
.lp-fiche-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.lp-fiche-stats>div{background:#FFFFFF;border:1px solid #E4E0D6;border-radius:12px;padding:10px;display:flex;flex-direction:column;gap:2px}
.lp-fiche-stats small{font-size:12px;color:#5E6B67}.lp-fiche-stats b{font-size:18px}
.lp-rail{height:8px;border-radius:999px;background:#E4E0D6;overflow:hidden}.lp-rail span{display:block;height:100%;background:#0E5A4E;border-radius:999px}
.lp-fiche-ligne{display:flex;align-items:center;gap:10px;background:#FFFFFF;border:1px solid #E4E0D6;border-radius:12px;padding:10px 12px;font-size:14px}
.lp-etat{font-size:12px;font-weight:600;border-radius:999px;padding:2px 10px;white-space:nowrap}
.lp-etat.e0{background:#F1EFEA;color:#3B4A47}.lp-etat.e1{background:#EAF0F5;color:#22476A}.lp-etat.e2{background:#FBEAE7;color:#9B2C20}

/* Données */
.lp-donnees{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:28px;align-items:center}
.lp-options{display:flex;flex-direction:column;gap:12px}
.lp-option{background:#FFFFFF;border:1px solid #E4E0D6;border-radius:18px;padding:18px;display:flex;gap:14px;align-items:flex-start}
.lp-option.mise{border:1.5px solid #0E5A4E}
.lp-explorateur{background:#FFFFFF;border:1px solid #E4E0D6;border-radius:22px;padding:16px 18px 18px;display:flex;flex-direction:column;gap:10px;box-shadow:0 30px 60px -36px rgba(8,59,52,.45)}
.lp-chemin{display:flex;align-items:center;gap:8px;font-size:13px;color:#5E6B67;background:#FAF8F4;border-radius:10px;padding:8px 10px}
.lp-fichier{display:flex;align-items:center;gap:10px;font-size:14px;padding:10px 12px;border:1px solid #EEEAE1;border-radius:12px}
.lp-synchro{display:inline-flex;align-items:center;gap:8px;align-self:flex-start;font-size:13px;font-weight:600;color:#0B4A40;background:#E3F0EC;border-radius:999px;padding:5px 12px}

/* Tarifs */
.lp-zone-prix{background:linear-gradient(180deg,#F5F3EE 0%,#EDEAE2 100%)}
.lp-bascule{display:inline-flex;background:#FFFFFF;border:1px solid #E4E0D6;border-radius:999px;padding:5px;gap:4px}
.lp-bascule-btn{position:relative;display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:0 20px;border:0;background:transparent;border-radius:999px;font:inherit;font-size:15px;font-weight:600;color:#3B4A47;cursor:pointer}
.lp-bascule-btn[data-actif=true]{color:#FFFFFF}
.lp-bascule-pastille{position:absolute;inset:0;border-radius:999px;background:#083B34}
.lp-eco{font-size:12px;font-weight:700;background:#F2A93B;color:#15201E;border-radius:999px;padding:2px 8px}
.lp-prix-grille{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px;width:100%;align-items:stretch}
.lp-prix{position:relative;background:#FFFFFF;border:1px solid #E4E0D6;border-radius:24px;padding:28px 24px;display:flex;flex-direction:column;gap:20px;box-shadow:0 10px 30px -24px rgba(8,59,52,.35)}
.lp-prix.pop{background:#083B34;color:#FFFFFF;border-color:#083B34;box-shadow:0 40px 70px -40px rgba(8,59,52,.8);transform:translateY(-8px)}
.lp-prix-ruban{position:absolute;top:-14px;inset-inline-start:24px;display:inline-flex;align-items:center;gap:6px;font-size:13px;font-weight:700;background:#F2A93B;color:#15201E;border-radius:999px;padding:5px 12px}
.lp-badge-fond{align-self:flex-start;font-size:12px;font-weight:700;border-radius:999px;padding:3px 10px;background:#FDF1DC;color:#7A4E06}
.lp-prix.pop .lp-badge-fond{background:rgba(242,169,59,.18);color:#F7C77A}
.lp-coche{flex:none;width:22px;height:22px;border-radius:50%;background:#E3F0EC;color:#0E5A4E;display:inline-flex;align-items:center;justify-content:center;margin-top:2px}
.lp-coche[data-pop=true]{background:rgba(159,224,198,.18);color:#9FE0C6}
.lp-prix.pop .lp-btn.action{box-shadow:none}
.lp-garanties{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;justify-content:center;gap:10px 24px}
.lp-garanties li{display:flex;align-items:center;gap:8px;font-size:15px;color:#3B4A47}

/* Avant / après */
.lp-table{background:#FFFFFF;border:1px solid #E4E0D6;border-radius:20px;overflow:hidden}
.lp-table>div{display:grid;grid-template-columns:1fr 1fr 1.2fr;border-top:1px solid #EEEAE1}
.lp-table>div:first-child{border-top:0}
.lp-table span{padding:14px 16px;font-size:15px;display:flex;align-items:center;gap:8px}
.lp-table .tete span{font-size:14px;font-weight:700;color:#5E6B67;background:#FAF8F4}
.lp-table .tete .avec{color:#FFFFFF;background:#0E5A4E}
.lp-table .sans{color:#5E6B67}.lp-table .sans svg{color:#C0392B;flex:none}
.lp-table .avec{background:#F1F8F5;color:#083B34;font-weight:600}.lp-table .avec svg{color:#0E5A4E;flex:none}

/* FAQ */
.lp-faq{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;align-items:start}
.lp-carte{background:#FFFFFF;border:1px solid #E4E0D6;border-radius:16px;box-shadow:0 10px 30px -24px rgba(8,59,52,.35)}
.lp details{padding:4px 18px}
.lp summary{cursor:pointer;list-style:none;display:flex;align-items:center;gap:12px;min-height:56px}
.lp summary::-webkit-details-marker{display:none}
.lp summary h3{margin:0;flex:1;font-size:16px;font-weight:600}
.lp details p{margin:0 0 14px;font-size:15px;line-height:1.85;color:#3B4A47}
.lp details[open] .lp-chev{transform:rotate(45deg)}
.lp-chev{transition:transform .2s;flex:none}
.lp-avert{display:flex;gap:8px;align-items:center;justify-content:center;margin:0;font-size:14px;color:#5E6B67;text-align:center}

/* Fin + pied */
.lp-fin{background:linear-gradient(135deg,#0E5A4E,#083B34);border-radius:28px;padding:36px;display:flex;flex-wrap:wrap;gap:20px;align-items:center;justify-content:space-between}
.lp-pied{background:#083B34;color:#CFE5DD;padding:32px 24px 24px;font-size:14px}
.lp-pied a{color:#E3F0EC;min-height:44px;display:inline-flex;align-items:center;gap:8px}
.lp-flot{display:none}

/* Flux mahakim → app → avocat */
.lp-flux{display:grid;grid-template-columns:1fr 1.2fr 1fr 1.2fr 1fr;align-items:center;gap:8px;background:#FFFFFF;border:1px solid #E4E0D6;border-radius:24px;padding:28px 20px}
.lp-noeud{display:flex;flex-direction:column;align-items:center;gap:8px;text-align:center}
.lp-noeud strong{font-size:16px}.lp-noeud small{font-size:13px;color:#5E6B67;line-height:1.5}
.lp-noeud-ico{width:64px;height:64px;border-radius:18px;background:#F1EFEA;color:#4D5B57;display:inline-flex;align-items:center;justify-content:center}
.lp-noeud.app .lp-noeud-ico{background:#0E5A4E;color:#FFFFFF;box-shadow:0 0 0 6px #E3F0EC}
.lp-liaison{position:relative;display:flex;flex-direction:column;align-items:center;gap:8px}
.lp-tirets{width:100%;height:3px;background:repeating-linear-gradient(90deg,#2E8B6E 0 10px,transparent 10px 18px);background-size:18px 3px;animation:lp-defile 1s linear infinite}
.lp[dir=rtl] .lp-tirets{animation-direction:reverse}
@keyframes lp-defile{to{background-position:18px 0}}
.lp-boucle{position:absolute;top:-14px;width:30px;height:30px;border-radius:50%;background:#E3F0EC;color:#0E5A4E;display:inline-flex;align-items:center;justify-content:center}
.lp-liaison small{font-size:12px;color:#0B4A40;text-align:center;margin-top:18px}
.lp-etapes{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
.lp-etapes li{display:flex;gap:12px;align-items:flex-start;background:#FFFFFF;border:1px solid #E4E0D6;border-radius:16px;padding:16px}
.lp-etapes strong{display:block;font-size:15px}.lp-etapes small{display:block;font-size:14px;color:#5E6B67;line-height:1.6}
.lp-etape-n{flex:none;width:30px;height:30px;border-radius:50%;background:#083B34;color:#FFFFFF;display:inline-flex;align-items:center;justify-content:center;font-weight:700}
/* IA */
.lp-ia{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px}
.lp-fn-ico.sombre{background:#083B34;color:#9FE0C6}
.lp-garde{display:flex;gap:10px;align-items:center;justify-content:center;margin:0;background:#F1F8F5;border:1px solid #CDE5DD;border-radius:16px;padding:14px 18px;font-size:15px;color:#0B4A40;text-align:center}
/* Documents */
.lp-docs{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:36px;align-items:center}
.lp-docs-liste{background:#FFFFFF;border:1px solid #E4E0D6;border-radius:22px;padding:18px;display:flex;flex-direction:column;gap:8px;box-shadow:0 30px 60px -36px rgba(8,59,52,.45)}
.lp-docs-liste>div{display:flex;align-items:center;gap:10px;font-size:14px;padding:9px 12px;border:1px solid #EEEAE1;border-radius:12px}
.lp-docs-liste span:nth-child(2){flex:1}
.lp-doc-ext{font-size:12px;color:#5E6B67;font-family:'IBM Plex Sans',sans-serif}
.lp-docs-liste .lp-docs-zip{background:#083B34;color:#FFFFFF;border:0;font-weight:600;justify-content:center}
/* Captures */
.lp-ecrans{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px}
.lp-ecran{margin:0;background:#FFFFFF;border:1px solid #E4E0D6;border-radius:20px;padding:12px;display:flex;flex-direction:column;gap:10px;box-shadow:0 30px 60px -40px rgba(8,59,52,.5)}
.lp-ecran img{display:block;width:100%;height:340px;object-fit:cover;object-position:top;border-radius:12px;border:1px solid #EEEAE1}
.lp-ecran figcaption{font-size:15px;font-weight:600;text-align:center}
@media (max-width:1080px){.lp-ia{grid-template-columns:repeat(2,minmax(0,1fr))}.lp-docs{grid-template-columns:1fr}}
@media (max-width:760px){
  .lp-flux{grid-template-columns:1fr;padding:22px 16px;gap:4px}
  .lp-liaison{padding:6px 0;gap:6px}
  .lp-tirets{width:3px;height:28px;background:repeating-linear-gradient(180deg,#2E8B6E 0 8px,transparent 8px 14px);background-size:3px 14px;animation:none}
  .lp-boucle{position:static}
  .lp-liaison small{margin:0;max-width:100%}
  .lp-etapes,.lp-ia,.lp-ecrans{grid-template-columns:1fr}
  .lp-ecran img{height:260px}
}
@media (prefers-reduced-motion:reduce){.lp-tirets{animation:none}}

@media (max-width:1080px){
  .lp-paires{grid-template-columns:repeat(2,minmax(0,1fr))}
  .lp-hero-grille,.lp-crm,.lp-donnees{grid-template-columns:1fr}
  .lp-prix-grille{grid-template-columns:1fr;max-width:480px}
  .lp-prix.pop{transform:none}
  .lp-bento{grid-template-columns:repeat(2,minmax(0,1fr))}
  .lp-nav{display:none}
}
@media (max-width:760px){
  .lp-sec{padding-left:16px !important;padding-right:16px !important}
  .lp-bloc{padding-top:64px;padding-bottom:64px}
  .lp-h1{font-size:34px}.lp-h2{font-size:27px}
  .lp-lead{font-size:16px}.lp-sous{font-size:17px}
  .lp-hero{border-radius:0 0 28px 28px;padding-bottom:64px}
  .lp-langue-long,.lp-connexion span{display:none}.lp-langue-court{display:inline}
  .lp-langue,.lp-connexion{padding:0 12px;min-width:44px;justify-content:center}
  .lp-paires,.lp-bento,.lp-faq{grid-template-columns:1fr}
  .lp-crm{padding:24px;border-radius:22px}
  .lp-fin{padding:24px}
  .lp-table>div{grid-template-columns:1fr 1fr}
  .lp-table [role=rowheader]{grid-column:1/-1;padding-bottom:0;background:#FFFFFF}
  .lp-table .tete span:first-child{display:none}
  .lp-mock-zone{padding-bottom:84px}
  .lp-flot{display:inline-flex;position:fixed;bottom:16px;left:16px;right:16px;z-index:50}
  .lp-pied{padding-bottom:96px}
}
@media (prefers-reduced-motion:reduce){.lp-btn,.lp-chev,.lp-paire{transition:none}.lp-btn:hover,.lp-paire:hover{transform:none}.lp-point{animation:none}}
`
