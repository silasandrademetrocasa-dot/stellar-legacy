/* V48.5 — hide the pilot's sprite/pet while offline simulation is active.
 * Visual only; all server reward / anti-cheat guards remain intact.
 */
import fs from 'node:fs';
const file='public/game.js',tag='STELLAR_OFFLINE_FARM_VISUAL_V485';
let s=fs.readFileSync(file,'utf8');
if(s.includes(tag)){console.log('✅ V48.5 visual already installed');process.exit(0);}
for(const anchor of ['function drawPlayer(){','function drawPet(){']){
  const n=s.split(anchor).length-1;
  if(n!==1)throw Error(`V48.5 visual anchor ${anchor} expected once, found ${n}`);
  s=s.replace(anchor,anchor+"if(document.body.classList.contains('stellar-offline-active-v485'))return; ");
}
s='/* '+tag+' */\n'+s;
fs.writeFileSync(file,s);console.log('✅ V48.5: nave e AUX ocultos no farm offline');
