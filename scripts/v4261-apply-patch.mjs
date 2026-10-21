#!/usr/bin/env node
// V42.6.1 - hotfix: shared auth module, Astral Rewards expansion and portal switching.
// Runs from npm run check AFTER the Universal ZIP Installer copies files; idempotent.
import {readFileSync,writeFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const VERSION='42.6.1';
const edit=(f,fn)=>{const p=resolve(root,f),old=readFileSync(p,'utf8'),out=fn(old);if(old!==out)writeFileSync(p,out,'utf8');};
function requirePart(s,part,f){if(!s.includes(part))throw Error(`V42.6.1: expected integration missing at ${f}: ${part.slice(0,95)}`);}
const API_IMPORT=`../api.js?v=${VERSION}`;

edit('server/index.js',s=>{
 const from="const RELEASE_VERSION = '42.6.0'",to=`const RELEASE_VERSION = '${VERSION}'`;
 if(s.includes(from))s=s.replace(from,to);
 requirePart(s,to,'server/index.js');return s;
});
edit('public/index.html',s=>{
 s=s.replaceAll('?v=42.6.0',`?v=${VERSION}`);
 requirePart(s,`/game.js?v=${VERSION}`,'public/index.html');
 requirePart(s,`/style.css?v=${VERSION}`,'public/index.html');
 requirePart(s,`/modules/astral-rewards-v381.js?v=${VERSION}`,'public/index.html');
 requirePart(s,`/modules/unified-expansion-v42.js?v=${VERSION}`,'public/index.html');
 return s;
});
edit('public/game.js',s=>{
 s=s.replaceAll('?v=42.6.0',`?v=${VERSION}`);
 requirePart(s,`./api.js?v=${VERSION}`,'public/game.js');
 return s;
});
// Game imports /api.js?v=VERSION. Without this suffix, independent UI modules
// instantiate a SECOND copy of api.js, with NULL in-memory session: "Sessão ausente".
for(const f of ['public/modules/unified-expansion-v42.js','public/modules/stage-a-v423.js','public/modules/stage-b-v426.js']){
 edit(f,s=>{
  const old="from '../api.js'",next=`from '${API_IMPORT}'`;
  if(s.includes(old))s=s.replaceAll(old,next);
  requirePart(s,next,f);return s;
 });
}
edit('public/modules/astral-rewards-v381.js',s=>{
 const file='public/modules/astral-rewards-v381.js';
 if(s.includes("from '../api.js'"))s=s.replaceAll("from '../api.js'",`from '${API_IMPORT}'`);
 requirePart(s,`from '${API_IMPORT}'`,file);
 const start='async function refresh(lockKey=null)';
 const end='const schema=';
 if(!s.includes('let queuedGate=null;')){
 let a=s.indexOf(start),b=s.indexOf(end,a);
 if(a===-1||b===-1||a>=b)throw Error('V42.6.1: Astral refresh anchor missing');
 const refresh=`// A portal change during a request is queued instead of being silently ignored.\nlet queuedGate=null;\nasync function refresh(lockKey=null){\n if(loading){if(lockKey)queuedGate=lockKey;return;}\n loading=true;\n try{\n  if(lockKey){try{await lockAstralRewardV381(lockKey);}catch(err){console.warn('[Astral Rewards] preview lock:',err?.message||err);}}\n  latest=await loadAstralRewardsV381();\n  renderPortal();\n  const admin=$('adminModal'),editor=$('astralAdminEditorV381');\n  if(visible(admin)&&visible(editor))renderAdmin();\n }catch(e){\n  const message=String(e?.message||e);\n  if(visible($('gateModal'))){const box=$('astralRewardV381');if(box)box.textContent='Astral Rewards indisponível: '+message;}\n  const editor=$('astralAdminEditorV381');\n  if(visible($('adminModal'))&&visible(editor))editor.textContent='Não foi possível carregar as recompensas: '+message;\n }finally{\n  loading=false;\n  if(queuedGate){const next=queuedGate;queuedGate=null;void refresh(next);}\n }\n}\n`;
 s=s.slice(0,a)+refresh+s.slice(b);
 }
 const saveBefore="latest=await adminSetAstralRewardV381(key,config);alert('Recompensas '+names[key]+' atualizadas no Supabase.');renderAdmin();renderPortal();";
 const saveAfter="await adminSetAstralRewardV381(key,config);await refresh();alert('Recompensas '+names[key]+' atualizadas no Supabase.');";
 if(s.includes(saveBefore))s=s.replace(saveBefore,saveAfter);
 requirePart(s,saveAfter,file);
 const setupIndex=s.indexOf('function setup(){');
 if(setupIndex===-1)throw Error('V42.6.1: Astral setup anchor missing');
 const setup=`function setup(){\n const modal=$('gateModal');if(!modal)return;\n const select=$('gateProtocolTabs');\n let lastKey=selected(),selectionTimer=null;\n const onSelect=()=>{\n  // Wait for game.js to finish toggling the .active tab class.\n  clearTimeout(selectionTimer);\n  selectionTimer=setTimeout(()=>{\n   const key=selected();if(key===lastKey)return;\n   lastKey=key;renderPortal();if(visible(modal))void refresh(key);\n  },0);\n };\n if(select){\n  select.addEventListener('click',onSelect);\n  new MutationObserver(onSelect).observe(select,{attributes:true,attributeFilter:['class'],subtree:true,childList:true});\n }\n new MutationObserver(()=>{if(visible(modal)){lastKey=selected();renderPortal();void refresh(lastKey);}})\n  .observe(modal,{attributes:true,attributeFilter:['class']});\n const admin=$('adminModal'),open=$('astralAdminOpenV381'),editor=$('astralAdminEditorV381');\n open?.addEventListener('click',()=>{\n  if(!editor)return;\n  const expanded=editor.classList.toggle('hidden')===false;\n  open.setAttribute('aria-expanded',String(expanded));\n  if(!expanded)return;\n  editor.textContent='Carregando editor de recompensas…';\n  if(latest?.gates)renderAdmin();\n  void refresh();\n });\n if(admin){\n  new MutationObserver(()=>{if(visible(admin)&&!latest)void refresh();})\n   .observe(admin,{attributes:true,attributeFilter:['class']});\n  // The legacy ADM dynamically renders its Aurora/Nexus/Eclipse buttons. Trigger\n  // the existing runtime refresh after selecting a different gate, so form data\n  // and wave configuration follow the selected portal without manual reload.\n  let adminGateTimer=null;\n  admin.addEventListener('click',event=>{\n   const button=event.target?.closest?.('button');\n   if(!button||!button.closest('.admin-runtime-monitor-section'))return;\n   const label=String(button.textContent||'').trim().toUpperCase();\n   if(!['AURORA','NEXUS','ECLIPSE'].includes(label))return;\n   clearTimeout(adminGateTimer);\n   adminGateTimer=setTimeout(()=>{\n    const button=$('adminRuntimeMonitorRefresh');\n    if(button&&!button.disabled)button.click();\n   },100);\n  });\n }\n if(visible(modal))void refresh(selected());\n}\nif(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});else setup();\n`;
 s=s.slice(0,setupIndex)+setup;
 return s;
});
edit('tests/stage-b-v426.test.mjs',s=>{
 const old="assert.equal(pkg.version,'42.6.0');",next=`assert.equal(pkg.version,'${VERSION}');`;
 if(s.includes(old))s=s.replace(old,next);
 requirePart(s,next,'tests/stage-b-v426.test.mjs');return s;
});
console.log('V42.6.1: shared session, Astral expansion and portal sync patch applied.');
