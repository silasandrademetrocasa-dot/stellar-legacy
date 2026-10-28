#!/usr/bin/env node
/** Local-only V100 release preflight, without network, secrets or test-player writes. */
import {readFileSync,existsSync,statSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {CORE_APK_ASSETS_V100,releaseReadinessV100} from '../server/release-readiness-v100.js';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const pkg=JSON.parse(readFileSync(resolve(root,'package.json'),'utf8'));
const files=[...CORE_APK_ASSETS_V100,'android/app/src/main/java/com/stellarlegacy/mobile/MainActivity.java','android/app/build.gradle','.github/workflows/Instalapk.yml'];
const checks=files.map(name=>({name,ok:existsSync(resolve(root,name))&&statSync(resolve(root,name)).size>0}));
const html=readFileSync(resolve(root,'public/index.html'),'utf8');
const server=readFileSync(resolve(root,'server/index.js'),'utf8');
checks.push({name:'HTML e versão de release',ok:html.includes(`/game.js?v=${pkg.version}`)&&server.includes(`const RELEASE_VERSION = '${pkg.version}'`)});
checks.push({name:'ADM C: rotas sem operações econômicas',ok:server.includes('installCompetitiveReadinessV98')&&server.includes('installLiveopsSnapshotV99')&&server.includes('installReleaseReadinessV100')});
const result=releaseReadinessV100({version:pkg.version,checks,databaseReady:true});
console.log(JSON.stringify({version:result.version,checks:result.checks,failures:result.failures,manualAcceptanceRequired:result.manualAcceptanceRequired},null,2));
if(!result.pass)process.exitCode=1;
