#!/usr/bin/env node
// Stellar Legacy V46.2 migration, called by the universal ZIP installer's npm run check.
// Files from ZIP are staged first. Safe: no deletion, no asset/DB changes.
import {readFileSync,writeFileSync,existsSync,readdirSync} from 'node:fs';
import {resolve} from 'node:path';
const ROOT=process.cwd();
const OLD='46.1.0',NEW='46.2.0';
const sourcePath=(p)=>resolve(ROOT,p);
const files=new Map();
function read(p){const file=sourcePath(p);if(!existsSync(file))throw Error(`Arquivo obrigatório ausente: ${p}`);return readFileSync(file,'utf8');}
function write(p,s){files.set(p,s);}
function patchOne(s,a,b,description){
  if(!s.includes(a))throw Error(`Âncora não encontrada (${description}). Instalador interrompido sem salvar.`);
  if(s.split(a).length!==2)throw Error(`Âncora repetida (${description}). Instalador interrompido sem salvar.`);
  return s.replace(a,b);
}
function insertAfter(s,anchor,insertion,description){return patchOne(s,anchor,anchor+insertion,description);}
const pkg=JSON.parse(read('package.json'));
if(pkg.name!=='stellar-legacy')throw Error('O comando deve ser executado na raiz do Stellar Legacy.');
if(![OLD,NEW].includes(pkg.version))throw Error(`Versão incompatível: encontrada ${pkg.version}; esperado ${OLD}/${NEW}.`);
if(!existsSync(sourcePath('public/modules/stellar-audio-v462.js')))throw Error('Módulo V46.2 não encontrado.');
if(!existsSync(sourcePath('tests/stellar-audio-v462.test.mjs')))throw Error('Testes V46.2 não encontrados.');
let game=read('public/game.js');
if(pkg.version===NEW&&game.includes('createStellarAudio')){console.log('V46.2.0 áudio já instalado; validando novamente.');process.exit(0);}
if(game.includes('createStellarAudio'))throw Error('Já existe uma instalação de áudio diferente nesta build.');
game="import {createStellarAudio} from './modules/stellar-audio-v462.js?v=46.2.0';\n"+game;
game=insertAfter(game,"let audioVolume=.70;\n","let audioProfile='auto';\n",'perfil de áudio');
game=patchOne(game,"let audioCtx=null;\nconst sfxLastAt=new Map();\n",'', 'remover engine antigo');
game=insertAfter(game,
 "    if(typeof saved.enabled==='boolean')audioEnabled=saved.enabled;\n",
 "    if(['auto','cinematic','balanced','lite'].includes(saved.profile))audioProfile=saved.profile;\n",
 'ler preferência');
game=patchOne(game,
 "function saveAudioSettings(){try{localStorage.setItem(AUDIO_STORAGE_KEY,JSON.stringify({enabled:audioEnabled,volume:audioVolume}));}catch{}}",
 "function saveAudioSettings(){try{localStorage.setItem(AUDIO_STORAGE_KEY,JSON.stringify({enabled:audioEnabled,volume:audioVolume,profile:audioProfile}));}catch{}}",
 'salvar preferência');
const oldStart=game.indexOf('function ensureAudioContext(){');
const oldEndMarker="addEventListener('keydown',unlockGameAudio);";
const oldEnd=game.indexOf(oldEndMarker,oldStart);
if(oldStart<0||oldEnd<0||oldEnd-oldStart>9500)throw Error('Motor de áudio antigo mudou; nenhuma modificação aplicada.');
const newEngine=`const stellarAudio=createStellarAudio(()=>({\n  enabled:audioEnabled,volume:audioVolume,\n  profile:audioProfile==='auto'?(resolvedQualityMode()==='low'?'lite':'cinematic'):audioProfile\n}));\nfunction playSfx(kind){return stellarAudio.play(kind);}\nfunction unlockGameAudio(){stellarAudio.unlock();}\nfunction setAudioEnabled(value){audioEnabled=!!value;saveAudioSettings();if(audioEnabled){unlockGameAudio();playSfx('pickup');}renderSettings();}\nfunction setAudioVolume(value){audioVolume=Math.max(0,Math.min(1,Number(value)||0));saveAudioSettings();if(ui?.audioVolumeValue)ui.audioVolumeValue.textContent=Math.round(audioVolume*100)+'%';}\nfunction setAudioProfile(value){audioProfile=['auto','cinematic','balanced','lite'].includes(value)?value:'auto';saveAudioSettings();playSfx('target');renderSettings();}\nfunction previewStellarAudio(){\n  if(!audioEnabled){showToast('Ative os efeitos sonoros para ouvir a prévia');return;}\n  unlockGameAudio();\n  ['laser','shield','rocket','explosion','portal','reward'].forEach((kind,i)=>setTimeout(()=>{if(audioEnabled)stellarAudio.play(kind,{force:true});},i*430));\n}\naddEventListener('pointerdown',unlockGameAudio,{passive:true});\naddEventListener('keydown',unlockGameAudio);`;
game=game.slice(0,oldStart)+newEngine+game.slice(oldEnd+oldEndMarker.length);
game=patchOne(game,
 "audioEnabledToggle: $('#audioEnabledToggle'), audioVolumeRange: $('#audioVolumeRange'), audioVolumeValue: $('#audioVolumeValue'),",
 "audioEnabledToggle: $('#audioEnabledToggle'), audioVolumeRange: $('#audioVolumeRange'), audioVolumeValue: $('#audioVolumeValue'), audioProfileSelect: $('#audioProfileSelect'), audioPreviewButton: $('#audioPreviewButton'),",
 'mapa de controles');
game=insertAfter(game,
 '  if(ui.audioVolumeValue)ui.audioVolumeValue.textContent=`${Math.round(audioVolume*100)}%`;\n',
 '  if(ui.audioProfileSelect)ui.audioProfileSelect.value=audioProfile;\n',
 'renderização dos ajustes');
game=insertAfter(game,
 'if(ui.audioVolumeRange)ui.audioVolumeRange.oninput=()=>setAudioVolume(Number(ui.audioVolumeRange.value)/100);\n',
 "if(ui.audioProfileSelect)ui.audioProfileSelect.onchange=()=>setAudioProfile(ui.audioProfileSelect.value);\nif(ui.audioPreviewButton)ui.audioPreviewButton.onclick=previewStellarAudio;\n",
 'eventos dos controles');
game=patchOne(game,"if(got>0){playSfx('pickup');spawnParticle(o.x,o.y,","if(got>0){playSfx('ore');spawnParticle(o.x,o.y,",'som da mineração');
game=patchOne(game,
 "  spawnExplosionFx(e.x,e.y,astral==='alpha'?'#5affdb':astral==='beta'?'#b68fff':next===1?'#ffb15f':'#ff3763',true);",
 "  playSfx('boss');spawnExplosionFx(e.x,e.y,astral==='alpha'?'#5affdb':astral==='beta'?'#b68fff':next===1?'#ffb15f':'#ff3763',true);",
 'som de mudança de fase do boss');
game=game.replaceAll('?v='+OLD,'?v='+NEW);
write('public/game.js',game);
let html=read('public/index.html');
const audioRow=`        <div class="audio-settings-row">\n          <label class="audio-toggle"><input type="checkbox" id="audioEnabledToggle" checked/> Efeitos sonoros</label>\n          <label class="audio-volume">Volume <input type="range" id="audioVolumeRange" min="0" max="100" step="5" value="70"/></label>\n        </div>`;
const newAudioRow=`        <div class="audio-settings-row">\n          <label class="audio-toggle"><input type="checkbox" id="audioEnabledToggle" checked/> Efeitos sonoros</label>\n          <label class="audio-volume">Volume <input type="range" id="audioVolumeRange" min="0" max="100" step="5" value="70"/></label>\n          <label class="audio-preset">Qualidade <select id="audioProfileSelect" aria-label="Qualidade do áudio"><option value="auto">AUTO (FPS)</option><option value="cinematic">IMERSIVO</option><option value="balanced">EQUILIBRADO</option><option value="lite">LEVE</option></select></label>\n          <button class="small-btn audio-preview-btn" id="audioPreviewButton" type="button">▶ OUVIR DEMO</button>\n        </div>\n        <small class="audio-hint">AUTO acompanha a qualidade gráfica: efeitos detalhados no alto e leves no baixo. Suas preferências ficam salvas neste aparelho.</small>`;
html=patchOne(html,audioRow,newAudioRow,'configurações de áudio no HTML');
html=html.replaceAll('?v='+OLD,'?v='+NEW);
write('public/index.html',html);
let css=read('public/style.css');
css+='\n/* V46.2 Audio Engine UI */\n.audio-settings-row{grid-template-columns:minmax(120px,1fr) minmax(180px,1.3fr) minmax(140px,1fr) auto;align-items:stretch}\n.audio-preset{justify-content:space-between}\n.audio-preset select{min-width:108px;max-width:150px;background:#0b2637;color:#b9eeff;border:1px solid #27617a;border-radius:6px;padding:5px;font-size:10px}\n.audio-preview-btn{align-self:stretch;white-space:nowrap;color:#6fe4ff;border:1px solid #21688a;background:#071b2b}\n.audio-hint{display:block;color:#7e9daa;font-size:10px;margin-top:8px}\n@media(max-width:860px){.audio-settings-row{grid-template-columns:1fr 1fr}}\n@media(max-width:540px){.audio-settings-row{grid-template-columns:1fr}.audio-preview-btn{min-height:34px}}\n';
write('public/style.css',css);
let server=read('server/index.js');
server=patchOne(server,`const RELEASE_VERSION = '${OLD}'`,`const RELEASE_VERSION = '${NEW}'`,'versão do servidor');
write('server/index.js',server);
pkg.version=NEW;
pkg.release='Galactic Soundscape V46.2: layered combat and portal audio, mobile voice limit, automatic low-FPS profile';
// The old V46.1 migration is already applied. Rerunning it after the version bump would fail.
pkg.scripts.check='node scripts/v462-apply-patch.mjs && node scripts/verify-release.mjs';
write('package.json',JSON.stringify(pkg,null,2)+'\n');
// Keep dynamically imported modules on the same cache key as the main game.
function walk(dir){return readdirSync(sourcePath(dir),{withFileTypes:true}).flatMap(e=>{const p=dir+'/'+e.name;return e.isDirectory()?walk(p):e.isFile()?[p]:[];});}
for(const p of walk('public').filter(x=>/\.(?:js|mjs|html|css)$/.test(x))){
  if(files.has(p))continue;
  const source=read(p),updated=source.replaceAll('?v='+OLD,'?v='+NEW);
  if(source!==updated)write(p,updated);
}
// Align existing regression tests with the new release version.
for(const f of readdirSync(sourcePath('tests')).filter(x=>x.endsWith('.test.mjs'))){
  const p='tests/'+f,s=read(p),updated=s
    .replaceAll(OLD,NEW)
    .replaceAll('/v461-apply-patch/','/v462-apply-patch/')
    // V45.1 asserts that V45.0 test checks the *current* release patch. Its
    // indirect includes() reference is a string, not a regex literal.
    .replaceAll("includes('v461-apply-patch')","includes('v462-apply-patch')");
  if(s!==updated)write(p,updated);
}
// Commit only after ALL replacements passed validation; never remove unrelated files.
for(const [p,content] of files)writeFileSync(sourcePath(p),content);
console.log(`✅ Stellar Legacy V${NEW} audio patch applied (${files.size} updated files + 2 files from ZIP).`);
console.log('▶ Running release checks; the universal installer publishes only if tests pass.');
console.log('▶ No SQL required. No saves, sprites, resources or map routing were touched.');
