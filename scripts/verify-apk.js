#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=f=>fs.readFileSync(path.join(ROOT,f),'utf8');
const assert=(ok,message)=>{if(!ok)throw Error('APK local: '+message);};
const report=JSON.parse(read('android/build/reports/stellar-assets-manifest.json'));
const html=read('public/index.html'),native=read('android/app/src/main/java/com/stellarlegacy/mobile/MainActivity.java');
const build=read('android/app/build.gradle'),manifest=read('android/app/src/main/AndroidManifest.xml');
assert(report.release===JSON.parse(read('package.json')).version,'versao de assets nao confere');
assert(report.files>=1050 && report.images>=1000,'pacote estatico incompleto');
assert(report.bytes>45*1024*1024,'imagem grande faltando');
assert(report.entries.some(x=>x.path==='assets/v17/manifest.js'),'manifest principal fora do APK');
assert(build.includes("file('../../public')"),'sourceSet local nao configurada');
assert(native.includes('.setDomain(host)') && native.includes('new WebViewAssetLoader.AssetsPathHandler(this)'),'WebView nao serve arquivos locais');
assert(native.includes('path.startsWith("/api/")')&&native.includes('return null;'),'API do Render nao esta liberada');
assert(native.includes('localFiles.shouldInterceptRequest(url)'),'arquivos estaticos nao sao interceptados');
assert(manifest.includes('android:usesCleartextTraffic="false"'),'HTTP nao protegido');
assert(!manifest.includes('READ_EXTERNAL_STORAGE'),'nao pedir armazenamento dos jogadores');
for(const x of ['index.html','style.css','game.js','api.js','world.js'])assert(report.entries.some(e=>e.path===x),'arquivo basico nao incluido: '+x);
const linked=[...html.matchAll(/\b(?:src|href)=["'](\/[^"']+)["']/g)]
 .map(m=>m[1].split('?')[0]).filter(x=>!x.startsWith('/api/') && !x.startsWith('/ws'));
const names=new Set(report.entries.map(x=>'/'+x.path));
for(const url of linked)assert(names.has(url),'HTML refere-se a arquivo inexistente no APK: '+url);
console.log(`✅ APK auditado: ${report.files} arquivos e ${report.images} imagens locais; chamadas /api e WSS /ws remotas; sem baixar jogo do Render.`);
