#!/usr/bin/env node
// Patch estritamente incremental da 42.1 para a 42.3, rodado pelo Instalador Universal.
import {readFileSync,writeFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
function edit(p,fn){const path=resolve(ROOT,p),before=readFileSync(path,'utf8'),after=fn(before);if(before!==after)writeFileSync(path,after,'utf8');}
function has(src,anchor,p){if(!src.includes(anchor))throw Error(`V42.3: integracao nao encontrada: ${p}: ${anchor}`);}
edit('server/index.js',src=>{
 if(!src.includes("from './stage-a-v423.js'"))src="import {attachStageAV423} from './stage-a-v423.js';\n"+src;
 src=src.replace("const RELEASE_VERSION = '42.1.0'","const RELEASE_VERSION = '42.3.0'");
 has(src,"const RELEASE_VERSION = '42.3.0'",'server/index.js');
 if(!src.includes('attachStageAV423(app,')){
  const anchor='// V19.0.9 • Catálogo único de balanceamento validado pelo Supabase.';
  has(src,anchor,'server/index.js');
  src=src.replace(anchor,`// V42.2+42.3: loadouts e operacoes, sem afetar o loop Canvas.\nattachStageAV423(app,{requireUser,asyncRoute});\n\n${anchor}`);
 }
 return src;
});
edit('public/api.js',src=>{
 if(src.includes('export async function loadStageAV423()'))return src;
 has(src,'async function authedServerFetch(','public/api.js');
 return src+`
// V42.3 - equipagem persistente + operacoes cooperativas verificadas.
export async function loadStageAV423(){return authedServerFetch('/api/frontier/v423/loadouts');}
export async function saveLoadoutV423(config,slot,item){return authedServerFetch('/api/frontier/v423/loadouts',{method:'POST',body:JSON.stringify({config,slot,item})});}
export async function loadOpsV423(){return authedServerFetch('/api/frontier/v423/operations');}
export async function claimOpsV423(tier){return authedServerFetch('/api/frontier/v423/operations/claim',{method:'POST',body:JSON.stringify({tier})});}
export async function adminOpsV423(tier,goal,minimum,reward,enabled){return authedServerFetch('/api/admin/frontier/v423/operations',{method:'POST',body:JSON.stringify({tier,goal,minimum,reward,enabled})});}
`;
});
edit('public/modules/unified-expansion-v42.js',src=>{
 if(!src.includes("from './stage-a-v423.js'"))src="import {renderStageAV423} from './stage-a-v423.js';\n"+src;
 const anchor="if(tab==='war')void v421ObjectiveRender(root);";
 has(src,anchor,'public/modules/unified-expansion-v42.js');
 if(!src.includes("renderStageAV423(root,tab)"))src=src.replace(anchor,anchor+"\nif(tab==='forge'||tab==='war'||tab==='admin')void renderStageAV423(root,tab);");
 return src;
});
for(const p of ['public/index.html','public/game.js'])edit(p,src=>src.replaceAll('?v=42.1.0','?v=42.3.0'));
edit('public/index.html',src=>{has(src,'/game.js?v=42.3.0','public/index.html');has(src,'/style.css?v=42.3.0','public/index.html');return src;});
edit('public/style.css',src=>src.includes('/* STAGE_A_V423 */')?src:src+`
/* STAGE_A_V423 */
.frontier-stage-v423{border-color:#82b9f1}
.frontier-v423-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:7px 0}
.frontier-v423-row label{flex:1 1 210px}
.frontier-v423-row select{width:100%;margin-top:3px}
.frontier-stage-v423 button{max-width:100%;white-space:normal}
`);
console.log('V42.3: equipamentos e operacoes integrados');
