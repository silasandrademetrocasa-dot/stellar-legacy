#!/usr/bin/env node
// V21 — static deterministic checks; no credentials, network or DB.
import {readFileSync,existsSync} from 'node:fs';
const ROOT=new URL('../',import.meta.url);
const r=f=>readFileSync(new URL(f,ROOT),'utf8');
const pkg=JSON.parse(r('package.json'));
const checks=[
 ['bundle modular V21',r('public/game.js').includes(`command-center-view.js?v=${pkg.version}`)],
 ['botão do Centro',r('public/index.html').includes('id="commandCenterBtn"')],
 ['modal de Centro',r('public/index.html').includes('id="commandCenterModal"')],
 ['PWA manifesto',r('public/index.html').includes(`/manifest.webmanifest?v=${pkg.version}`)],
 ['cache exclui API/saves',r('public/sw.js').includes("req.mode!=='navigate'")],
 ['ícone 192',existsSync(new URL('public/icons/stellar-192.png',ROOT))],
 ['ícone 512',existsSync(new URL('public/icons/stellar-512.png',ROOT))]
];
const fails=checks.filter(([,ok])=>!ok);
for(const [name,ok] of checks)console.log(`${ok?'✅':'❌'} ${name}`);
if(fails.length)process.exitCode=1;
