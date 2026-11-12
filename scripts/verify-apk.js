#!/usr/bin/env node
/**
 * Audita o pacote realmente incluído no APK Android.
 * V136 elimina centenas de sprites duplicados: não usar a contagem de imagens
 * da V135 como requisito. Exigir que TODAS as artes do catálogo V136 existam.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=f=>fs.readFileSync(path.join(ROOT,f),'utf8');
const assert=(ok,message)=>{if(!ok)throw Error('APK local: '+message);};
const report=JSON.parse(read('android/build/reports/stellar-assets-manifest.json'));
const pkg=JSON.parse(read('package.json'));
const html=read('public/index.html');
const native=read('android/app/src/main/java/com/stellarlegacy/mobile/MainActivity.java');
const build=read('android/app/build.gradle');
const androidManifest=read('android/app/src/main/AndroidManifest.xml');
const art=JSON.parse(read('public/assets/v136/manifest.json'));
const v137=JSON.parse(read('public/assets/v137/manifest.json'));

// Inventário gerado a partir de public/ (sourceSet local, sem baixar as artes).
assert(report.release===pkg.version,'versão de assets não confere');
assert(report.assetSource==='public/'&&report.androidSourceSet==='../../public','origem dos assets do APK incorreta');
assert(Array.isArray(report.entries),'inventário de arquivos ausente');
const names=new Set(report.entries.map(e=>e.path));
const imagePattern=/\.(?:png|webp|jpe?g|svg|gif)$/i;
assert(names.size===report.entries.length,'arquivos duplicados no inventário');
assert(report.files===report.entries.length,'total de arquivos inconsistente');
assert(report.images===report.entries.filter(e=>imagePattern.test(e.path)).length,'total de imagens inconsistente');
assert(report.bytes===report.entries.reduce((n,e)=>n+e.size,0),'tamanho do pacote inconsistente');
assert(report.bytes>45*1024*1024,'pacote local muito pequeno: artes podem estar faltando');
assert(report.entries.every(e=>e.size>0&&/^[0-9a-f]{64}$/.test(e.sha256)),'arquivo vazio ou sem hash no inventário');

const has=f=>names.has(f);
assert(has('assets/v17/manifest.js'),'manifest principal fora do APK');
assert(has('assets/v136/manifest.json'),'manifest do catálogo visual V136 fora do APK');
assert(art.version==='V136.0','versão do catálogo visual inesperada');
const ships=Object.entries(art.ships||{});
const npcs=Object.entries(art.npcs||{});
assert(ships.length===43,'catálogo de naves V136 incompleto');
assert(npcs.length===40,'catálogo de NPCs V136 incompleto');
let checked=0;
function verifyAsset(url,description){
 assert(typeof url==='string'&&url.startsWith('/assets/v136/'),'caminho inválido de '+description);
 const rel=url.slice(1);
 assert(!url.includes('..')&&!url.includes('?')&&imagePattern.test(rel),'referência de arte inválida: '+description);
 assert(has(rel),'sprite não incluído no APK: '+description+' ('+rel+')');
 const entry=report.entries.find(e=>e.path===rel);
 assert(entry.size>=100,'sprite vazio ou truncado: '+description+' ('+rel+')');
 checked++;
}
for(const [id,ship] of ships){
 const views=ship.views||{};
 for(const kind of ['card','map','top','front'])verifyAsset(views[kind],'nave '+id+' '+kind);
}
for(const [id,npc] of npcs)verifyAsset(npc.path,'NPC '+id);

// V137: AUDITORIA VISUAL COMPLETA. Não basta contar arquivos; todos os 40 sprites aprovados
// (26 equipamentos, seis portais, sete drones, AUX estático e atlas animado) precisam existir.
assert(v137.version==='V137.0','versão das novas artes V137 incorreta');
assert(has('assets/v137/manifest.json'),'catálogo visual V137 fora do APK');
const v137Visuals=[...v137.equipment.map(n=>`equipment/${n}.webp`),
  ...v137.portals.map(n=>`portals/${n}.webp`),...v137.drones.map(n=>`drones/${n}.webp`),
  'aux/aux9.webp'];
for(const item of v137Visuals){const path='assets/v137/'+item;
 assert(has(path),'sprite HD V137 não incluído no APK: '+path);
 assert(report.entries.find(e=>e.path===path)?.size>2000,'sprite HD V137 truncado: '+path);
}
assert(v137.aux.frames===1&&v137.aux.grid==='1x1','AUX não usa quadro superior estático');
// Proíbe que a remoção de artes antigas seja confundida com perda de novas.
const oldDirs=/^assets\/(?:v17\/(?:ships|ships-map|npcs)|v52_4\/(?:ships|npcs)|v62\/showroom|v63\/ships|v65\/(?:ships|npcs)|v66\/(?:ships|npcs)|v67\/npcs|v3021\/ships)\//;
assert(!report.entries.some(e=>oldDirs.test(e.path)),'sprites legados ainda presentes no APK');

assert(build.includes("file('../../public')"),'sourceSet local não configurada');
assert(native.includes('.setDomain(host)')&&native.includes('new WebViewAssetLoader.AssetsPathHandler(this)'),'WebView não serve arquivos locais');
assert(read('android/app/src/main/java/com/stellarlegacy/mobile/AssetRoutePolicy.java').includes('path.startsWith("/api/")')&&native.includes('Route.DATA) return null;'),'API do Render não está liberada');
assert(native.includes('localFiles.shouldInterceptRequest(url)'),'arquivos estáticos não são interceptados');
assert(androidManifest.includes('android:usesCleartextTraffic="false"'),'HTTP não protegido');
assert(!androidManifest.includes('READ_EXTERNAL_STORAGE'),'não pedir armazenamento dos jogadores');
for(const f of ['index.html','style.css','game.js','api.js','world.js'])assert(has(f),'arquivo básico não incluído: '+f);
const linked=[...html.matchAll(/\b(?:src|href)=["'](\/[^"']+)["']/g)]
 .map(m=>m[1].split('?')[0]).filter(x=>!x.startsWith('/api/')&&!x.startsWith('/ws'));
for(const url of linked)assert(has(url.slice(1)),'HTML refere-se a arquivo inexistente no APK: '+url);
console.log(`✅ APK auditado: ${report.files} arquivos, ${report.images} imagens, ${ships.length} naves, ${npcs.length} NPCs, ${checked} referências V136 e ${v137Visuals.length} visuais V137 verificados. API e WSS continuam remotas.`);

const art141=JSON.parse(fs.readFileSync(path.join(ROOT,'public/assets/v141/manifest.json'),'utf8'));
for(const rel of Object.keys(art141.files))assert(has(rel),'arte V141 fora do APK: '+rel);
