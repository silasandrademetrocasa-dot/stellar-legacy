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
assert(npcs.length===48,'catálogo de NPCs V136 incompleto');
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

// Proíbe que a remoção de artes antigas seja confundida com perda de novas.
const oldDirs=/^assets\/(?:v17\/(?:ships|ships-map|npcs)|v52_4\/(?:ships|npcs)|v62\/showroom|v63\/ships|v65\/(?:ships|npcs)|v66\/(?:ships|npcs)|v67\/npcs|v3021\/ships)\//;
assert(!report.entries.some(e=>oldDirs.test(e.path)),'sprites legados ainda presentes no APK');

assert(build.includes("file('../../public')"),'sourceSet local não configurada');
assert(native.includes('.setDomain(host)')&&native.includes('new WebViewAssetLoader.AssetsPathHandler(this)'),'WebView não serve arquivos locais');
assert(native.includes('path.startsWith("/api/")')&&native.includes('return null;'),'API do Render não está liberada');
assert(native.includes('localFiles.shouldInterceptRequest(url)'),'arquivos estáticos não são interceptados');
assert(androidManifest.includes('android:usesCleartextTraffic="false"'),'HTTP não protegido');
assert(!androidManifest.includes('READ_EXTERNAL_STORAGE'),'não pedir armazenamento dos jogadores');
for(const f of ['index.html','style.css','game.js','api.js','world.js'])assert(has(f),'arquivo básico não incluído: '+f);
const linked=[...html.matchAll(/\b(?:src|href)=["'](\/[^"']+)["']/g)]
 .map(m=>m[1].split('?')[0]).filter(x=>!x.startsWith('/api/')&&!x.startsWith('/ws'));
for(const url of linked)assert(has(url.slice(1)),'HTML refere-se a arquivo inexistente no APK: '+url);
console.log(`✅ APK auditado: ${report.files} arquivos, ${report.images} imagens, ${ships.length} naves, ${npcs.length} NPCs, ${checked} referências visuais V136 verificadas. API e WSS continuam remotas.`);
