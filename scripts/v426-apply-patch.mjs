#!/usr/bin/env node
// Stellar Legacy V42.6, cumulative ZIP stage 2/2, base 42.3.0; re-entrant patch.
// The Universal Installer does not execute ZIP scripts directly; npm run check does.
import {readFileSync,writeFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const update=(f,fn)=>{const full=resolve(ROOT,f),old=readFileSync(full,'utf8'),next=fn(old);if(next!==old)writeFileSync(full,next,'utf8')};
function requireAnchor(code,anchor,path){if(!code.includes(anchor))throw Error(`V42.6: âncora ausente em ${path}: ${anchor.slice(0,100)}`)}
const version='42.6.0';
update('server/index.js',s=>{
 if(!s.includes("from './stage-b-v426.js'"))s="import {attachStageBV426} from './stage-b-v426.js';\n"+s;
 s=s.replace("const RELEASE_VERSION = '42.3.0'",`const RELEASE_VERSION = '${version}'`);
 requireAnchor(s,`const RELEASE_VERSION = '${version}'`,'server/index.js');
 if(!s.includes('attachStageBV426(app,')){
  const anchor='// V19.0.9 • Catálogo único de balanceamento validado pelo Supabase.';
  requireAnchor(s,anchor,'server/index.js');
  s=s.replace(anchor,`// V42.4-42.6: instâncias de investigação, mercado com custódia e clãs.\nattachStageBV426(app,{requireUser,asyncRoute});\n\n${anchor}`);
 }
 return s;
});
update('public/api.js',s=>{
 if(s.includes('export async function loadExplorationV426('))return s;
 requireAnchor(s,'async function authedServerFetch(','public/api.js');
 return s+`
// V42.4–42.6 | trusted HTTP bridge; never pass balance, damage, kill count or rewards.
export async function loadExplorationV426(){return authedServerFetch('/api/frontier/v426/exploration');}
export async function startSectorV426(sector,requestId){return authedServerFetch('/api/frontier/v426/exploration/start',{method:'POST',body:JSON.stringify({sector,requestId})});}
export async function claimSectorV426(runId){return authedServerFetch('/api/frontier/v426/exploration/claim',{method:'POST',body:JSON.stringify({runId})});}
export async function loadMarketV426(){return authedServerFetch('/api/frontier/v426/market');}
export async function offerMarketV426(item,quantity,unitPrice,requestId){return authedServerFetch('/api/frontier/v426/market/sell',{method:'POST',body:JSON.stringify({item,quantity,unitPrice,requestId})});}
export async function buyMarketV426(offerId){return authedServerFetch('/api/frontier/v426/market/buy',{method:'POST',body:JSON.stringify({offerId})});}
export async function cancelMarketV426(offerId){return authedServerFetch('/api/frontier/v426/market/cancel',{method:'POST',body:JSON.stringify({offerId})});}
export async function loadClanProjectsV426(){return authedServerFetch('/api/frontier/v426/clan');}
export async function fundClanProjectV426(structure,points,requestId){return authedServerFetch('/api/frontier/v426/clan/fund',{method:'POST',body:JSON.stringify({structure,points,requestId})});}
export async function adminSectorV426(code,minutes,kills,cost,reward,enabled){return authedServerFetch('/api/admin/frontier/v426/sector',{method:'POST',body:JSON.stringify({code,minutes,kills,cost,reward,enabled})});}
export async function adminMarketV426(feeBps,enabled){return authedServerFetch('/api/admin/frontier/v426/market',{method:'POST',body:JSON.stringify({feeBps,enabled})});}
export async function adminClanV426(structure,goal,enabled){return authedServerFetch('/api/admin/frontier/v426/clan',{method:'POST',body:JSON.stringify({structure,goal,enabled})});}
`;
});
update('public/modules/unified-expansion-v42.js',s=>{
 if(!s.includes("from './stage-b-v426.js'"))s="import {renderStageBV426} from './stage-b-v426.js';\n"+s;
 const anchor="if(tab==='forge'||tab==='war'||tab==='admin')void renderStageAV423(root,tab);";
 requireAnchor(s,anchor,'public/modules/unified-expansion-v42.js');
 if(!s.includes('renderStageBV426(root,tab)'))s=s.replace(anchor,anchor+"\nif(tab==='scout'||tab==='civil'||tab==='admin')void renderStageBV426(root,tab);");
 return s;
});
for(const f of ['public/index.html','public/game.js'])update(f,s=>s.replaceAll('?v=42.3.0',`?v=${version}`));
update('public/index.html',s=>{requireAnchor(s,`/game.js?v=${version}`,'public/index.html');requireAnchor(s,`/style.css?v=${version}`,'public/index.html');return s});
update('public/style.css',s=>s.includes('/* V426_FINAL_FRONTIER */')?s:s+`
/* V426_FINAL_FRONTIER */
.frontier-final-v426{border-color:#70adce}
.frontier-sectors-v426{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:9px;margin:13px 0}
.frontier-sector-v426{display:flex;flex-direction:column;gap:6px;justify-content:space-between;padding:14px;border-radius:10px;border:1px solid #466489;background:radial-gradient(circle at 70% 18%,rgba(100,160,255,.2),transparent 58%),#101b33}
.frontier-sector-star-v426{font-size:28px;color:#91caff;text-shadow:0 0 18px #4083d5}
.frontier-sector-v426 strong{color:#c2e1ff}
.frontier-sector-v426 button,.frontier-final-v426 button{width:auto;max-width:100%;white-space:normal}
.frontier-final-v426 label{display:inline-flex;flex-direction:column;gap:4px;margin:6px 10px 6px 0;min-width:140px;max-width:100%}
.frontier-final-v426 label input[type=checkbox]{align-self:flex-start}
.frontier-final-v426 section{overflow-wrap:anywhere}
@media(max-width:640px){.frontier-sectors-v426{grid-template-columns:1fr}.frontier-final-v426 label{width:100%}}
`);
console.log('V42.6: final incremental integration applied; no server-authoritative ship damage changes.');
