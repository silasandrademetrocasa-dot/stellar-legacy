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

test('GitHub possui workflow APK valido, independentemente do nome do arquivo',()=>{
  // O workflow pode ter sido renomeado ao instalar a revisao manualmente.
  // Exigir apenas Instalapk.yml era um falso negativo em GitHub Actions.
  const base=new URL('../.github/workflows/',import.meta.url);
  const workflowFiles=fs.readdirSync(base).filter(name=>/\.ya?ml$/i.test(name));
  const candidates=workflowFiles.map(name=>({
    name,
    code:fs.readFileSync(new URL(name,base),'utf8')
  }));
  const apkWorkflows=candidates.filter(({code})=>
    /scripts\/prepare-apk-assets\.js/.test(code) &&
    /scripts\/verify-apk\.js/.test(code) &&
    /assembleDebug/.test(code)
  );
  assert.ok(apkWorkflows.length>=1,
    'Nenhum workflow completo de APK em .github/workflows. Encontrados: '+workflowFiles.join(', '));
  for(const {name,code} of apkWorkflows){
    assert.match(code,/actions\/checkout@/,name+': precisa baixar o codigo');
    assert.match(code,/gradle/,name+': precisa compilar o APK local');
  }
  for(const file of ['scripts/prepare-apk-assets.js','scripts/verify-apk.js','android/app/src/main/AndroidManifest.xml']){
    assert.ok(fs.existsSync(new URL('../'+file,import.meta.url)),
      'Dependencia real do APK ausente: '+file);
  }
});
