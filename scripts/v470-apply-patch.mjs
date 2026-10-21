#!/usr/bin/env node
// Stellar Legacy V47 Combat Reborn — idempotent, fail-closed universal-ZIP migration.
// Client-only visual, sound and local-NPC tactical enhancements. No SQL or save mutation.
import {readFileSync,writeFileSync,existsSync,readdirSync} from 'node:fs';
import {resolve,join,extname} from 'node:path';
const ROOT=process.cwd(),OLD='46.2.0',NEW='47.0.0',changes=new Map();
const path=f=>resolve(ROOT,f);
function read(f){if(!existsSync(path(f)))throw Error('V47 arquivo ausente: '+f);return readFileSync(path(f),'utf8');}
function put(f,s){changes.set(f,s);}
function replace(s,a,b,label){
  const count=s.split(a).length-1;
  if(count!==1)throw Error(`V47 ancora ${label}: esperado 1, encontrado ${count}. Nenhum arquivo alterado.`);
  return s.replace(a,b);
}
function after(s,a,b,label){return replace(s,a,a+b,label);}
function allFiles(root){return readdirSync(path(root),{withFileTypes:true}).flatMap(e=>{const f=join(root,e.name);return e.isDirectory()?allFiles(f):e.isFile()?[f]:[];});}
const pkg=JSON.parse(read('package.json'));
if(pkg.name!=='stellar-legacy'||![OLD,NEW].includes(pkg.version))throw Error('V47 requer Stellar Legacy V46.2.0');
for(const f of ['public/modules/combat-reborn-v470.js','public/modules/stellar-audio-v462.js','tests/combat-reborn-v470.test.mjs'])read(f);
let game=read('public/game.js');
if(pkg.version===NEW&&game.includes('createCombatRebornV470')){
  console.log('V47.0.0 ja instalado: executando verificacoes sem modificar arquivos.');process.exit(0);
}
if(!game.includes('createStellarAudio')||game.includes('createCombatRebornV470'))throw Error('V47 precisa da instalacao V46.2 sem Combat Reborn preexistente.');
game=`import {createCombatRebornV470,npcTacticalDriftV470,drawPortalSignatureV470} from './modules/combat-reborn-v470.js?v=${NEW}';\n`+game;
game=after(game,"let audioProfile='auto';\n",`let rebornFxEnabled=(()=>{try{return localStorage.getItem('stellar_combat_reborn_fx_v47')!=='off';}catch{return true;}})();\nconst rebornFx=createCombatRebornV470();\n`,'estado opt-in efeitos');
// Graphic events are appended to the existing FX pipeline, not to server combat calls.
game=replace(game,
  `  state.fx.push({x,y,color,size:low?size*.65:size,type,life:low?.50:1,maxLife:low?.50:1,rot:rand(0,TWO_PI)});\n  capVisualFx();`,
  `  state.fx.push({x,y,color,size:low?size*.65:size,type,life:low?.50:1,maxLife:low?.50:1,rot:rand(0,TWO_PI)});\n  rebornFx.emit(type==='shield'?'shield':'hit',x,y,{color,size,quality:resolvedQualityMode(),mobile:DEVICE_CAPS.mobile,enabled:rebornFxEnabled});\n  capVisualFx();`,
  'anel de impacto');
game=replace(game,
  `  const sparks=low?(boss?2:1):(boss?18:10);`,
  `  rebornFx.emit(boss?'boss':'blast',x,y,{color,size:boss?95:42,quality:resolvedQualityMode(),mobile:DEVICE_CAPS.mobile,enabled:rebornFxEnabled});\n  const sparks=low?(boss?2:1):(boss?18:10);`,
  'explosoes escalonadas');
game=replace(game,
  `  playSfx('boss');spawnExplosionFx(e.x,e.y,astral==='alpha'?`,
  `  rebornFx.emit('threat',e.x,e.y,{color:'#ff6688',size:Math.max(45,Number(e.size||30)*2),quality:resolvedQualityMode(),mobile:DEVICE_CAPS.mobile,enabled:rebornFxEnabled});\n  playSfx('boss');spawnExplosionFx(e.x,e.y,astral==='alpha'?`,
  'assinatura fase boss');
// Tactical orbit never applies to shared/authoritative NPCs or overrides safe-zone decisions.
game=replace(game,
  `      const nd=Math.max(1,d),nx=e.x+dx/nd*e.speed*dt,ny=e.y+dy/nd*e.speed*dt;`,
  `      const nd=Math.max(1,d),tactic=npcTacticalDriftV470(e,{dx,dy,d,dt,now,safe:baseSafe||mapSafeZone&&!retaliating});\n      const nx=e.x+dx/nd*e.speed*dt+tactic.x,ny=e.y+dy/nd*e.speed*dt+tactic.y;`,
  'elites flanqueando com limite');
game=replace(game,
  `  updateWarfrontRuntime();updateGalaxyEvent(dt);updateParticles(dt);updateFx(dt);updateAlphaGate();updateAuctionSystem();`,
  `  updateWarfrontRuntime();updateGalaxyEvent(dt);updateParticles(dt);updateFx(dt);rebornFx.tick(dt);updateAlphaGate();updateAuctionSystem();`,
  'ciclo de efeitos');
game=replace(game,
  `if(q.fx)drawFx();drawParticles();drawNavigationOverlay();`,
  `if(q.fx)drawFx();rebornFx.draw(ctx,screenPos,{quality:resolvedQualityMode(),mobile:DEVICE_CAPS.mobile,enabled:rebornFxEnabled});drawParticles();drawNavigationOverlay();`,
  'renderizacao dos efeitos');
game=replace(game,
  `ctx.fillText(portal.targetLabel||displayMapLabel(portal.to,portal.targetTerritoryFaction),0,-60);ctx.restore();continue;`,
  `ctx.fillText(portal.targetLabel||displayMapLabel(portal.to,portal.targetTerritoryFaction),0,-60);if(rebornFxEnabled)drawPortalSignatureV470(ctx,portal,{quality:'low',time:t,mobile:DEVICE_CAPS.mobile});ctx.restore();continue;`,
  'portais low');
game=replace(game,
  `ctx.fillText(portal.targetLabel||displayMapLabel(portal.to,portal.targetTerritoryFaction),0,-66);ctx.restore();`,
  `ctx.fillText(portal.targetLabel||displayMapLabel(portal.to,portal.targetTerritoryFaction),0,-66);if(rebornFxEnabled)drawPortalSignatureV470(ctx,portal,{quality:resolvedQualityMode(),time:t,mobile:DEVICE_CAPS.mobile});ctx.restore();`,
  'portais detalhados');
game=replace(game,
  `  const mode=resolvedQualityMode(),cap=mode==='low'?12:Infinity;`,
  `  const mode=resolvedQualityMode(),cap=mode==='low'?12:DEVICE_CAPS.mobile?42:75;`,
  'limite mobile para partículas de impacto');
// Sound changes occur only at previously-confirmed actions.
game=replace(game,
  `function playSfx(kind){return stellarAudio.play(kind);}`,
  `function playSfx(kind){return stellarAudio.play(kind);}\nfunction playWeaponSfxV470(){const ammo=String(progress?.selectedLaserAmmo||'');return playSfx(ammo==='ucb100'||ammo==='mcb50'?'laserHeavy':'laser');}\nfunction setRebornFxEnabledV470(value){rebornFxEnabled=!!value;try{localStorage.setItem('stellar_combat_reborn_fx_v47',rebornFxEnabled?'on':'off');}catch{}if(!rebornFxEnabled)rebornFx.clear();renderSettings();}`,
  'novos tipos de laser');
// Exactly two real firing sites: queue PvP and local PvE.
if(game.split("    playSfx('laser');").length!==2||game.split("  playSfx('laser');").length<2)throw Error('V47 tiros laser: contagem inesperada');
game=game.replace("    playSfx('laser');","    playWeaponSfxV470();");
game=replace(game,"  playSfx('laser');\n  const allBase=laserPveBase", "  playWeaponSfxV470();\n  const allBase=laserPveBase",'som laser PvE');
game=replace(game,
  `  if(beforeShield>0&&player.shield<=0){setCombatAlert('ESCUDO ROMPIDO','shield',2.3);triggerCombatFlash('blue');}`,
  `  if(beforeShield>0&&player.shield<=0){playSfx('shieldBreak');setCombatAlert('ESCUDO ROMPIDO','shield',2.3);triggerCombatFlash('blue');}`,
  'escudo rompido');
game=replace(game,
  `  const justFinishedMoving=movementPositionRuntime.wasMoving&&!stillMoving;`,
  `  if(wasMoving&&nowSec()-(state.lastEngineSoundV470||0)>2.5){state.lastEngineSoundV470=nowSec();if(resolvedQualityMode()!=='low')playSfx('engine');}\n  const justFinishedMoving=movementPositionRuntime.wasMoving&&!stillMoving;`,
  'motor de nave throttled');
game=replace(game,
  `state.jumping=true;player.laserFiring=false;playSfx('portal');ui.portalPrompt?.classList.add('hidden');`,
  `state.jumping=true;player.laserFiring=false;playSfx(['b41','b42','b43'].includes(targetMapId)?'portalPvp':'portal');ui.portalPrompt?.classList.add('hidden');`,
  'assinatura PvP em teleporte');
game=replace(game,
  `state.jumping=true;player.laserFiring=false;playSfx('portal');ui.jumpTitle.textContent=`,
  `state.jumping=true;player.laserFiring=false;playSfx('portalAstral');ui.jumpTitle.textContent=`,
  'assinatura astral');
game=replace(game,
  `['laser','shield','rocket','explosion','portal','reward'].forEach((kind,i)=>`,
  `['laser','laserHeavy','shieldBreak','rocket','explosion','portalPvp','portalAstral','reward'].forEach((kind,i)=>`,
  'demonstracao completa Combat Reborn');
game=replace(game,
  `audioPreviewButton: $('#audioPreviewButton'),`,
  `audioPreviewButton: $('#audioPreviewButton'), combatRebornVisualToggle: $('#combatRebornVisualToggle'),`,
  'botao config Fx');
game=after(game,
  `  if(ui.audioProfileSelect)ui.audioProfileSelect.value=audioProfile;\n`,
  `  if(ui.combatRebornVisualToggle)ui.combatRebornVisualToggle.checked=rebornFxEnabled;\n`,
  'preferencia FX no modal');
game=after(game,
  `if(ui.audioPreviewButton)ui.audioPreviewButton.onclick=previewStellarAudio;\n`,
  `if(ui.combatRebornVisualToggle)ui.combatRebornVisualToggle.onchange=()=>setRebornFxEnabledV470(ui.combatRebornVisualToggle.checked);\n`,
  'evento checkbox efeitos');
put('public/game.js',game.replaceAll('?v='+OLD,'?v='+NEW));
let audio=read('public/modules/stellar-audio-v462.js');
audio=replace(audio,`  'critical','event','ore','boss'`,`  'critical','event','ore','boss','engine','laserHeavy','portalPvp','portalAstral','shieldBreak'`,'audio kinds');
audio=replace(audio,`  event:650,ore:270,boss:1100`,`  event:650,ore:270,boss:1100,engine:2450,laserHeavy:115,portalPvp:800,portalAstral:850,shieldBreak:1200`,'audio cooldown');
audio=replace(audio,`      case 'boss':\n`,
`      case 'engine':
        tone(78*v,112*v,.24,'triangle',.16);
        if(rich)tone(125*v,96*v,.19,'sine',.10,.06);break;
      case 'laserHeavy':
        tone(1450*v,240*v,.14,'sawtooth',.66);
        if(mid)tone(2150*v,560*v,.10,'square',.24,.012);
        if(rich)noise(.08,.18,4700,.01,true);break;
      case 'portalPvp':
        tone(310*v,85*v,.42,'sawtooth',.45);
        if(mid)tone(110,760,.40,'triangle',.34,.14);break;
      case 'portalAstral':
        tone(78,940,.52,'sine',.49);
        if(mid)tone(130,1400*v,.43,'triangle',.27,.08);
        if(rich)tone(620,1720,.26,'sine',.18,.25);break;
      case 'shieldBreak':
        noise(.23,.46,2250);
        if(mid)tone(840*v,96*v,.26,'square',.35,.045);break;
      case 'boss':
`, 'camadas de audio');
put('public/modules/stellar-audio-v462.js',audio);
let html=read('public/index.html');
html=replace(html,
  `        <small class="audio-hint">AUTO acompanha a qualidade gráfica: efeitos detalhados no alto e leves no baixo. Suas preferências ficam salvas neste aparelho.</small>`,
  `        <small class="audio-hint">AUTO acompanha a qualidade gráfica: efeitos detalhados no alto e leves no baixo. Suas preferências ficam salvas neste aparelho.</small>\n        <label class="reborn-audio-cues"><input type="checkbox" id="combatRebornVisualToggle" checked/> Efeitos táticos Combat Reborn (anéis de impacto, chefes e portais)</label>`,
  'toggle no HTML');
put('public/index.html',html.replaceAll('?v='+OLD,'?v='+NEW));
let css=read('public/style.css');
css+='\n/* V47.0 — Combat Reborn • sem impacto no HUD principal */\n.reborn-audio-cues{display:flex;align-items:center;gap:9px;font-size:11px;color:#b1dcec;margin-top:9px;padding:7px 10px;border:1px solid rgba(82,204,245,.15);border-radius:8px;background:rgba(3,20,37,.52)}\n.reborn-audio-cues input{accent-color:#55dfff}\n@media(max-width:550px){.reborn-audio-cues{font-size:10px;line-height:1.45}}\n';
put('public/style.css',css);
const server=read('server/index.js');
put('server/index.js',replace(server,`const RELEASE_VERSION = '${OLD}'`,`const RELEASE_VERSION = '${NEW}'`,'version server'));
pkg.version=NEW;
pkg.release='Combat Reborn V47.0: layered combat SFX, visual impact FX, elite tactical orbit, portal cues, mobile budget';
pkg.scripts.check='node scripts/v470-apply-patch.mjs && node scripts/verify-release.mjs';
put('package.json',JSON.stringify(pkg,null,2)+'\n');
// Match cache versions across ES imports and service worker references.
for(const f of allFiles('public').filter(x=>['.js','.mjs','.html','.css'].includes(extname(x)))){
  if(changes.has(f))continue;
  const old=read(f),now=old.replaceAll('?v='+OLD,'?v='+NEW);
  if(now!==old)put(f,now);
}
// Do not remove or rewrite historical test bodies: update only release identifiers / patch name.
for(const f of allFiles('tests').filter(x=>x.endsWith('.test.mjs'))){
  const old=read(f),now=old.replaceAll(OLD,NEW)
    .replaceAll(OLD.replaceAll('.','\\.'),NEW.replaceAll('.','\\.'))
    .replaceAll('v462-apply-patch','v470-apply-patch');
  if(now!==old)put(f,now);
}
// Atomic-ish validation: all anchors resolved before any writes, with a fixed final change set.
for(const [f,s] of changes)writeFileSync(path(f),s,'utf8');
console.log(`✅ V${NEW}: Combat Reborn em ${changes.size} arquivos, sem SQL, saves ou mudanças de recompensas.`);
