#!/usr/bin/env node
// V38.1 — atualização incremental sem reempacotar o game.js (>1MB).
// Executado por `npm run check` após o Instalador Universal copiar o ZIP.
// Falha de âncora aborta o deploy, sem sobrescrever arquivos desconhecidos.
import {readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=path=>readFileSync(resolve(ROOT,path),'utf8');
const save=(path,content)=>writeFileSync(resolve(ROOT,path),content,'utf8');
function edit(path,fn){const a=read(path),b=fn(a);if(a!==b)save(path,b);}
function must(hay,needle,path){if(!hay.includes(needle))throw Error(`V38.1: âncora ausente ${path}: ${needle}`);}
const version='38.1.0';
edit('server/index.js',c=>{
 if(!c.includes("import {attachAstralRewardsV381}"))c="import {attachAstralRewardsV381} from './astral-rewards-v381.js';\n"+c;
 c=c.replace("const RELEASE_VERSION = '38.0.0'",`const RELEASE_VERSION = '${version}'`);
 must(c,`const RELEASE_VERSION = '${version}'`,'server/index.js');
 const marker='// V19.0.9 • Catálogo único de balanceamento validado pelo Supabase.';
 if(!c.includes('attachAstralRewardsV381(app,')){must(c,marker,'server/index.js');c=c.replace(marker,`// V38.1 — endpoints de prêmios e ADM (Supabase como fonte única).\nattachAstralRewardsV381(app,{requireUser,asyncRoute,requireEliteAdmin});\n\n${marker}`);}
 return c;
});
edit('public/api.js',c=>{
 if(c.includes('export async function loadAstralRewardsV381('))return c;
 return c+`\n// V38.1 — Astral Rewards: sessão autenticada do jogo, nunca service_role no navegador.\nexport async function loadAstralRewardsV381(){return authedServerFetch('/api/astral-rewards');}\nexport async function lockAstralRewardV381(gate){return authedServerFetch('/api/astral-rewards/lock',{method:'POST',body:JSON.stringify({gate})});}
export async function claimAstralRewardV381(gate){return authedServerFetch('/api/astral-rewards/claim',{method:'POST',body:JSON.stringify({gate})});}\nexport async function adminSetAstralRewardV381(gate,config){return authedServerFetch('/api/admin/astral-rewards',{method:'POST',body:JSON.stringify({gate,config})});}\n`;
});
edit('public/index.html',c=>{
 c=c.replaceAll('?v=38.0.0',`?v=${version}`);
 if(!c.includes('id="astralRewardV381"')){
  const regex=/(<div class="gate-reward-note">[\s\S]*?<\/div>)/;
  if(!regex.test(c))throw Error('V38.1: painel de recompensa do portal não encontrado');
  c=c.replace(regex,`$1\n<div id="astralRewardV381" class="astral-rewards-box" aria-live="polite"><small>ASTRAL REWARDS · aguarde a prévia…</small></div>`);
 }
 if(!c.includes('id="astralAdminOpenV381"')){
  const needle='<section class="admin-runtime-monitor-section">';must(c,needle,'public/index.html');
  c=c.replace(needle,`${needle}\n<div class="astral-adm-toggle"><button type="button" class="small-btn gold" id="astralAdminOpenV381">✦ ASTRAL REWARDS · ADM</button><div id="astralAdminEditorV381" class="astral-rewards-adm hidden"></div></div>`);
 }
 if(!c.includes('/modules/astral-rewards-v381.js')){must(c,'</body>','public/index.html');c=c.replace('</body>',`<script type="module" src="/modules/astral-rewards-v381.js?v=${version}"></script>\n</body>`);}
 must(c,`/game.js?v=${version}`,'public/index.html');must(c,`/style.css?v=${version}`,'public/index.html');
 return c;
});
edit('public/game.js',c=>c.replaceAll('?v=38.0.0',`?v=${version}`));
edit('public/style.css',c=>{
 if(c.includes('/* ASTRAL_REWARDS_V381 */'))return c;
 return c+`\n/* ASTRAL_REWARDS_V381 */
.astral-rewards-box{margin:12px 0;padding:12px;border:1px solid rgba(175,216,255,.35);border-radius:12px;background:rgba(15,27,55,.82);font-size:12px;color:#e4f2ff}
.astral-rewards-title{font-weight:800;letter-spacing:.07em;color:#c6e9ff;margin-bottom:8px}
.astral-rewards-box p{margin:5px 0 9px;line-height:1.65;overflow-wrap:anywhere}
.astral-rewards-box small{display:block;color:#afc7df;line-height:1.5;margin:5px 0}
.astral-rewards-actions{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin:8px 0}
.astral-rewards-actions button:disabled{opacity:.5;cursor:not-allowed}
.astral-adm-toggle{margin:8px 0 12px}
.astral-rewards-adm{padding:12px;border:1px solid rgba(160,185,255,.3);border-radius:12px;max-height:65vh;overflow:auto}
.astral-rewards-adm.hidden{display:none}
.astral-adm-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px}
.astral-adm-grid fieldset{min-width:0;border:1px solid #667994;border-radius:9px;padding:9px}
.astral-adm-grid label{display:flex;flex-direction:column;margin:6px 0;font-size:12px;gap:3px}
.astral-adm-grid input,.astral-adm-grid select{width:100%;min-width:0;padding:7px;border-radius:5px;background:#101a30;color:#e5f4ff;border:1px solid #587295}
.astral-rewards-history{margin:14px 0 0;font-size:12px;line-height:1.7}
@media(max-width:660px){.astral-adm-grid{grid-template-columns:1fr}.astral-rewards-box{padding:8px}.astral-rewards-actions button{width:100%}}
`;
});
console.log('V38.1 Astral Rewards aplicado/validado (idempotente).');
