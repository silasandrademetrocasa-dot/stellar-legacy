#!/usr/bin/env node
/** Only removes legacy SHIP/NPC asset duplicates replaced by /assets/v136. No game saves, API, gear, stages, or designer data is touched. */
import {rmSync,existsSync,statSync} from 'node:fs';
import {resolve,join,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const assetBase=resolve(root,'public/assets');
const mandatory=[
 'v136/ships/top/aurora.webp','v136/ships/front/aurora.webp',
 'v136/ships/map/aurora.webp','v136/npcs/scavenger.webp',
 'v136/npcs/streuner.webp','v136/manifest.json'
];
for(const p of mandatory){if(!existsSync(join(assetBase,p)))throw new Error('V136 incompleta, limpeza cancelada: '+p);}
const dirs=['v17/ships','v17/ships-map','v17/npcs','v52_4/ships','v52_4/npcs','v62/showroom','v63/ships','v65/ships','v65/npcs','v66/ships','v66/npcs','v67/npcs','v3021/ships'];
let total=0;
for(const d of dirs){
 const target=resolve(assetBase,d);
 if(!target.startsWith(assetBase+'/')||target===assetBase)throw new Error('Caminho rejeitado: '+d);
 if(!existsSync(target))continue;
 rmSync(target,{recursive:true,force:true});total++;
 console.log('Apagado:',relative(root,target));
}
console.log(`V136: ${total} diretórios antigos removidos; outras artes e saves preservados.`);
