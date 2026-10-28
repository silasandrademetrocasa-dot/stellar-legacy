import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const ROOT=new URL('../',import.meta.url);
const read=(f)=>fs.readFileSync(new URL(f,ROOT),'utf8');

test('APK Android conserva assets e o jogo no mesmo dominio HTTPS da API',()=>{
  const native=read('android/app/src/main/java/com/stellarlegacy/mobile/MainActivity.java');
  assert.match(native,/\.setDomain\(host\)/);
  assert.match(native,/AssetsPathHandler\(this\)/);
  assert.match(native,/browser\.loadUrl\(origin \+ "\/index\.html"\)/);
  assert.match(native,/path\.startsWith\("\/api\/"\)/);
  assert.match(native,/localFiles\.shouldInterceptRequest\(url\)/);
  assert.match(native,/new WebResourceResponse\("text\/plain", "UTF-8", 404/);
});

test('APK contem sprites naves, drones, AUX, NPCs, mapas, portais e caixas',()=>{
  const base=new URL('../public/assets/',import.meta.url);
  for(const pathPart of ['v65/ships','v66/aux','v67/npcs','mapas/V80_Fundos_Distintos','animations/v71/Portais','v52_3/cards']){
    const target=new URL(pathPart+'/',base);
    assert.ok(fs.existsSync(target),`asset local ausente: ${pathPart}`);
    assert.ok(fs.readdirSync(target).length>0,`asset sem arquivos: ${pathPart}`);
  }
});

test('APK nao insere servidor, SQL nem keys privadas como recursos locais',()=>{
  const gradle=read('android/app/build.gradle');
  assert.match(gradle,/file\('\.\.\/\.\.\/public'\)/);
  assert.doesNotMatch(gradle,/assets\.srcDirs.*server/);
  assert.doesNotMatch(gradle,/assets\.srcDirs.*sql/);
  const manifest=read('android/app/src/main/AndroidManifest.xml');
  assert.match(manifest,/usesCleartextTraffic="false"/);
  assert.doesNotMatch(manifest,/READ_EXTERNAL_STORAGE|MANAGE_EXTERNAL_STORAGE/);
});

test('Build original do GitHub tem seus scripts preparador/verificador e android/',()=>{
  const workflow=read('.github/workflows/Instalapk.yml');
  assert.match(workflow,/scripts\/prepare-apk-assets\.js/);
  assert.match(workflow,/scripts\/verify-apk\.js/);
  assert.ok(fs.existsSync(new URL('../scripts/prepare-apk-assets.js',import.meta.url)));
  assert.ok(fs.existsSync(new URL('../scripts/verify-apk.js',import.meta.url)));
  assert.ok(fs.existsSync(new URL('../android/app/src/main/AndroidManifest.xml',import.meta.url)));
});
