/* Stellar Legacy V50, idempotent cumulative ship fleet patch.
 * The universal installer applies this to the live repository after V49.5.
 * This script never deletes player inventory or changes combat stats.
 */
import fs from 'node:fs';
import assert from 'node:assert/strict';
const MARK='STELLAR_SHIPS3D_FLEET_V50';
const ids=['phoenix','leonov','liberator','piranha','vengeance','bigboy','goliath','citadel','aegis','spearhead','defcom','yamato','nostromo'];
const files=['public/game.js','public/data.js','server/index.js'];
for(const f of files)assert(fs.existsSync(f),`V50 exige arquivo ${f}`);
if(files.every(f=>fs.readFileSync(f,'utf8').includes(MARK))){console.log('✅ Frota V50 já instalada');process.exit(0);}
if(files.some(f=>fs.readFileSync(f,'utf8').includes(MARK)))throw Error('V50 parcial: restaure a versão anterior antes de tentar novamente');
const written=new Map();
function edit(file,update){let src=written.get(file)??fs.readFileSync(file,'utf8');src=update(src);written.set(file,src);}
function once(s,needle,replacement,kind){const hits=s.split(needle).length-1;if(hits!==1)throw Error(`V50 ${kind}: âncora encontrada ${hits}x`);return s.replace(needle,replacement);}
function patchDrawing(s,start,end,kind,patch){
 const a=s.indexOf(start);let b=end?s.indexOf(end,a+start.length):-1;
 if(!end && a>=0){ const tail=s.slice(a+start.length),next=/^function\s+[A-Za-z_$][\w$]*\s*\(/m.exec(tail);if(next)b=a+start.length+next.index; }
 if(a<0||b<0)throw Error(`V50 ${kind} renderer: funções de desenho não encontradas; verifique versão do game.js`);
 const part=s.slice(a,b),updated=patch(part);
 if(part===updated)throw Error(`V50 ${kind} renderer: nenhuma alteração aplicada`);
 return s.slice(0,a)+updated+s.slice(b);
}
function chooseInsertAfterGameImport(s){const rx=/^import\s*\{[^\n]+\}\s*from\s*['"]\.\/data\.js\?v=[^'"\n]+['"];?\s*$/m;if(!rx.test(s))throw Error('V50: import catálogo no game.js mudou');return s.replace(rx,m=>m+"\nimport { createStellarShipRendererV50, isShipAllowedV50, ensureAllowedShipSaveV50 } from './modules/stellar-ship3d-v50.js?v=47.7.6';\nconst STELLAR_3D_V50=createStellarShipRendererV50();");}
edit('public/game.js',s=>{
 s=chooseInsertAfterGameImport(s);
 // Existing ship data remain available for historical progression/auction records;
 // only these 13 are allowed to equip or buy.
 s=once(s,'function hydrateProgress(){\n  if(!progress)return;',`function hydrateProgress(){\n  if(!progress)return;\n  if(ensureAllowedShipSaveV50(progress)){cloudDirty=true;try{console.info('[ships3d-v50] nave incompatível convertida em Aurora; equipamento preservado');}catch{}}`, 'load/migration');
 s=once(s,'function switchShip(shipId){',`function switchShip(shipId){\n  if(!isShipAllowedV50(shipId)){showToast('Esta nave foi retirada da frota. Ative uma das 13 naves disponíveis.');return;}`, 'ship select');
 s=once(s,'function buyShip(shipId){',`function buyShip(shipId){\n  if(!isShipAllowedV50(shipId)){showToast('Nave indisponível na frota atual.');return;}`, 'ship purchase');
 s=once(s,'function liveQuote(key){',`function liveQuote(key){\n  if(String(key||'').startsWith('ship:')&&!isShipAllowedV50(String(key).slice(5)))return null;`, 'store quote');
 s=once(s,'  const catalog=Object.values(SHIPS);',`  const catalog=Object.values(SHIPS).filter(s=>isShipAllowedV50(s.id));`,'hangar 13 ships');
 s=once(s,"  const wrap=document.createElement('div');wrap.className='ship-grid';",`  const modeBar=document.createElement('div');modeBar.className='section-box';modeBar.style.cssText='display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:10px;margin:8px 0';\n  const ship3dMode=document.createElement('button');ship3dMode.type='button';ship3dMode.className='small-btn';ship3dMode.textContent='NAVE 3D: '+(STELLAR_3D_V50.getMode()==='off'?'DESLIGADO':'ATIVO');ship3dMode.onclick=()=>{STELLAR_3D_V50.setMode(STELLAR_3D_V50.getMode()==='off'?'auto':'off');renderHangar();};\n  const ship3dInfo=document.createElement('small');ship3dInfo.textContent='3D leve com fallback 2D em aparelhos incompatíveis • 13 naves';modeBar.append(ship3dMode,ship3dInfo);root.appendChild(modeBar);\n  const wrap=document.createElement('div');wrap.className='ship-grid';`,'3D toggle');
 // Robust insertion: preserve the entire current renderer (which V49.x can rewrite).
 // We wrap only the actual ship paint block, then let the existing vitals, HUD,
 // nameplate, lasers and drones run exactly as before.
 s=patchDrawing(s,'function drawPlayer(){','function drawParticles(){','player',src=>{
   const begin=/ctx\.save\(\)\s*;\s*ctx\.translate\(p\.x\s*,\s*p\.y\)\s*;/g;
   const finish=/ctx\.restore\(\)\s*;\s*drawDrones\(p\)\s*;/g;
   const nStart=[...src.matchAll(begin)],nFinish=[...src.matchAll(finish)];
   if(nStart.length!==1 || nFinish.length!==1 || nFinish[0].index<=nStart[0].index){
     throw Error(`V50 player renderer: não consegui isolar a pintura da nave (início ${nStart.length}, fim ${nFinish.length}); sem modificar arquivo`);
   }
   // Use end first so offsets are stable.
   src=src.slice(0,nFinish[0].index)+`  }\n  ctx.restore();drawDrones(p);`+src.slice(nFinish[0].index+nFinish[0][0].length);
   const open=`ctx.save();ctx.translate(p.x,p.y);\n  if(STELLAR_3D_V50.draw(ctx,progress.activeShipId,a,shipSize)){\n    ctx.save();ctx.rotate(a+Math.PI/2);drawEngineWakeLocal(shipSize,color,motion,progress.profile.level||0);ctx.restore();\n    drawDesignerAuraLocal(shipSize,designer,visual,progress.profile.level||0);\n  }else{`;
   src=src.slice(0,nStart[0].index)+open+src.slice(nStart[0].index+nStart[0][0].length);
   return src;
 });
 s=patchDrawing(s,'function drawOnlinePlayers(){',null,'remote',src=>{
   // V49.x changes the sprite branch layout, so match the conditional by its
   // semantics rather than hard-coded whitespace or following statements.
   const rx=/if\s*\(\s*img\s*&&\s*img\.naturalWidth\s*\)\s*\{/g;
   const matches=[...src.matchAll(rx)];
   if(matches.length!==1)throw Error(`V50 remote renderer: condição de sprite encontrada ${matches.length}x; sem modificar arquivo`);
   const injection=`if(STELLAR_3D_V50.draw(ctx,isShipAllowedV50(rp.shipId)?rp.shipId:'phoenix',rp.angle||0,size)){\n      ctx.save();ctx.rotate((rp.angle||0)+Math.PI/2);drawEngineWakeLocal(size,visual.glow||color,moving?1:0,Number(rp.level)||0);ctx.restore();\n      drawDesignerAuraLocal(size,designer,visual,Number(rp.level)||0);\n    }else if(img&&img.naturalWidth){`;
   return src.slice(0,matches[0].index)+injection+src.slice(matches[0].index+matches[0][0].length);
 });
 return `/* ${MARK} */\n`+s;
});
edit('public/data.js',s=>{
 const marker=`\n/* ${MARK}: 43 historic definitions preserved for backwards-compatible saves;\n * only the 13 approved classes are playable/marketable. */\n{\n const allowed=new Set(${JSON.stringify(ids)});\n for(const [id,ship] of Object.entries(SHIPS)){if(!allowed.has(id)){ship.shopAvailable=false;ship.auctionEligible=false;ship.eventOnly=true;ship.unavailableV50=true;}}\n}\n`;
 // append after all definitions (top-level module statement; SHIPS exists before execution).
 return s+marker;
});
edit('server/index.js',s=>{
 // Critical: server-side persistence normalization blocks bypassing the client filter.
 const middleware=`/* ${MARK}: server-authoritative 13 ships, without deleting ownership/inventory */\nconst SHIP_IDS_V50=new Set(${JSON.stringify(ids)});\nfunction normalizeShipSaveV50(state){\n  if(!state||typeof state!=='object')return;\n  if(SHIP_IDS_V50.has(String(state.activeShipId||'')))return;\n  state.activeShipId='phoenix';\n  if(!Array.isArray(state.ownedShips))state.ownedShips=[];\n  if(!state.ownedShips.includes('phoenix'))state.ownedShips.push('phoenix');\n  if(state.repairRequired&&typeof state.repairRequired==='object')state.repairRequired.shipId='phoenix';\n}\napp.use('/api/save',(req,res,next)=>{if(req.method==='PUT'&&req.body?.state)normalizeShipSaveV50(req.body.state);next();});\n`;
 const rx=/app\.put\('\/api\/save',\s*requireUser,/;
 if(!rx.test(s))throw Error('V50: servidor salvamento mudou, revisão manual obrigatória');
 return s.replace(rx,m=>middleware+m);
});
// Only write after all validation passes, prevents half-patched live installations.
for(const [file,src] of written)fs.writeFileSync(file,src);
console.log(`✅ ${MARK}: 13 GLB, filtro de nave, migração segura, 3D/WebGL e botão 2D/3D`);
