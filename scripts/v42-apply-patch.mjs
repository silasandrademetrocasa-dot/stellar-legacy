#!/usr/bin/env node
// V42: small and idempotent patch on 38.1.0. The universal installer runs this
// during `npm run check`. A missing anchor aborts the workflow before any push.
import {readFileSync,writeFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>readFileSync(resolve(ROOT,p),'utf8');
const write=(p,fn)=>{const before=read(p),after=fn(before);if(before!==after)writeFileSync(resolve(ROOT,p),after,'utf8')};
const need=(src,anchor,p)=>{if(!src.includes(anchor))throw Error(`V42: ponto de integracao ausente em ${p}: ${anchor.slice(0,90)}`)};
const version='42.0.0';
write('server/index.js',src=>{
  if(!src.includes("from './frontier-unified-v42.js'"))src="import {attachFrontierUnifiedV42} from './frontier-unified-v42.js';\n"+src;
  const old="const RELEASE_VERSION = '38.1.0'";
  if(src.includes(old))src=src.replace(old,`const RELEASE_VERSION = '${version}'`);
  need(src,`const RELEASE_VERSION = '${version}'`,'server/index.js');
  if(!src.includes('attachFrontierUnifiedV42(app,')){
    const anchor='// V19.0.9 • Catálogo único de balanceamento validado pelo Supabase.';
    need(src,anchor,'server/index.js');
    src=src.replace(anchor,`// V39–42: extensoes incrementais autenticadas.\nattachFrontierUnifiedV42(app,{requireUser,asyncRoute});\n\n${anchor}`);
  }
  return src;
});
write('public/api.js',src=>{
  if(src.includes('export async function loadUnifiedExpansionV42('))return src;
  need(src,'async function authedServerFetch(','public/api.js');
  return src+`\n// V39–V42: APIs autenticadas; nenhum acesso direto a segredos.\nexport async function loadUnifiedExpansionV42(){return authedServerFetch('/api/frontier/v42');}\nexport async function actUnifiedExpansionV42(action,code,amount=1,idempotencyKey){return authedServerFetch('/api/frontier/v42/action',{method:'POST',body:JSON.stringify({action,code,amount,idempotencyKey})});}\nexport async function squadUnifiedExpansionV42(action,inviteCode=''){return authedServerFetch('/api/frontier/v42/squad',{method:'POST',body:JSON.stringify({action,inviteCode})});}\nexport async function adminUnifiedExpansionV42(code,cost){return authedServerFetch('/api/admin/frontier/v42/catalog',{method:'POST',body:JSON.stringify({code,cost})});}\n`;
});
write('public/index.html',src=>{
  // Versioned JS/CSS with previous artifacts intact.
  src=src.replaceAll('?v=38.1.0',`?v=${version}`);
  need(src,`/game.js?v=${version}`,'public/index.html');
  need(src,`/style.css?v=${version}`,'public/index.html');
  if(!src.includes('id="frontierExpansionBtnV42"')){
    const anchor='<div class="modal hidden" id="adminModal">';
    need(src,anchor,'public/index.html');
    src=src.replace(anchor,`<button id="frontierExpansionBtnV42" class="frontier-quick-v42" type="button" title="Expansoes do Universo">✦ UNIVERSO</button>\n<div id="frontierExpansionModalV42" class="modal hidden" role="dialog" aria-modal="true" aria-labelledby="frontierExpansionTitleV42"><div class="modal-card frontier-panel-v42"><div class="modal-header"><div><div class="eyebrow">EXPANSÃO UNIFICADA</div><h2 id="frontierExpansionTitleV42">UNIVERSO ESTELAR</h2></div><button class="small-btn" id="frontierExpansionCloseV42" type="button">FECHAR</button></div><div id="frontierExpansionContentV42" class="frontier-content-v42"></div></div></div>\n${anchor}`);
  }
  if(!src.includes('/modules/unified-expansion-v42.js')){
    need(src,'</body>','public/index.html');
    src=src.replace('</body>',`<script type="module" src="/modules/unified-expansion-v42.js?v=${version}"></script>\n</body>`);
  }
  return src;
});
write('public/game.js',src=>src.replaceAll('?v=38.1.0',`?v=${version}`));
// O teste V38.1 anterior fixava a versão exata; ele deve aceitar futuras releases
// sem perder os checks de portais e de rotas antigas.
write('tests/astral-rewards-v381.test.mjs',src=>src.replace(
  "assert.equal(pkg.version,'38.1.0');",
  "assert.ok(Number(pkg.version.split('.')[0])>=38, 'release não pode regredir');"));
write('public/style.css',src=>{
  if(src.includes('/* UNIFIED_EXPANSION_V42 */'))return src;
  return src+`\n/* UNIFIED_EXPANSION_V42 */
.frontier-quick-v42{position:fixed;right:12px;top:72px;z-index:28;background:#172641;color:#d5ebff;border:1px solid #6aa4e0;border-radius:8px;padding:7px 10px;font-size:11px;font-weight:800;cursor:pointer;max-width:110px}
.frontier-panel-v42{width:min(850px,95vw);max-height:88vh;overflow:auto}
.frontier-content-v42{color:#e0edff;font-size:13px;line-height:1.55}
.frontier-tabs-v42{display:flex;flex-wrap:wrap;gap:5px;margin:10px 0}
.frontier-tabs-v42 button{font-size:11px;padding:7px;border:1px solid #576786;background:#172341;color:#c8ddfb;border-radius:8px}
.frontier-tabs-v42 button.active{background:#315886;color:white}
.frontier-card-v42{padding:11px;margin:8px 0;border:1px solid #415c7b;border-radius:10px;background:rgba(10,22,45,.75)}
.frontier-card-v42 h4{margin:0 0 6px;color:#b3ddff}
.frontier-card-v42 small{color:#b0bcd0}
.frontier-card-v42 button{margin:8px 0 0;padding:7px 10px;background:#315886;border:1px solid #9bc8fa;color:white;border-radius:7px;cursor:pointer}
.frontier-card-v42 button:disabled{opacity:.5;cursor:default}
.frontier-input-v42{padding:7px;border-radius:5px;background:#111b2e;border:1px solid #6b85a5;color:white;max-width:100%}
@media(max-width:640px){.frontier-quick-v42{right:7px;top:59px;font-size:10px;padding:5px 7px}.frontier-panel-v42{width:98vw;max-height:85vh}.frontier-content-v42{font-size:12px}}
`;
});
console.log('V42: patch cumulativo aplicado; V38.1 preservada.');
