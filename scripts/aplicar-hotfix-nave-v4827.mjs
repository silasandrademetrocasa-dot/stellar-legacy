import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const cssFile=path.join(root,'public/modules/pilot-ship-hud-v482.css');
const jsFile=path.join(root,'public/modules/pilot-ship-hud-v482.js');
const signature='STELLAR-SHIP-RECOVERY-V4827';
if(!fs.existsSync(cssFile)||!fs.existsSync(jsFile)){
  throw new Error('Execute na raiz do projeto Stellar Legacy com public/modules/pilot-ship-hud-v482.{css,js} presentes.');
}
const cssPatch=`\n/* ${signature}: manter N clicavel mesmo quando nave esta minimizada.\n   A regra anterior de CONF usa maior especificidade e mantinha os botoes visiveis. */\n#topHudDock #leftStats.collapsed{\n  box-sizing:border-box!important;\n  width:40px!important;min-width:40px!important;max-width:40px!important;\n  height:40px!important;min-height:40px!important;max-height:40px!important;\n  flex:0 0 40px!important;padding:2px!important;overflow:hidden!important;\n  position:relative!important;z-index:28!important;\n}\n#topHudDock #leftStats.collapsed .stats-toolbar #battleConfigToolbar.battle-config-ship-hud-v2014{\n  display:none!important;visibility:hidden!important;pointer-events:none!important;\n}\n#topHudDock #leftStats.collapsed .stats-toolbar{\n  display:flex!important;align-items:center!important;justify-content:center!important;\n  width:36px!important;min-width:36px!important;max-width:36px!important;\n  height:36px!important;min-height:36px!important;max-height:36px!important;\n  margin:0!important;padding:0!important;overflow:visible!important;\n}\n#topHudDock #leftStats.collapsed #statsToggle{\n  display:grid!important;place-items:center!important;position:relative!important;z-index:2!important;\n  width:36px!important;min-width:36px!important;height:36px!important;min-height:36px!important;\n  padding:0!important;margin:0!important;pointer-events:auto!important;touch-action:manipulation!important;\n}\n`;
const recoveryJs=`  // ${signature}: atalho de emergencia que nao depende do card recolhido.\n  const recoveryMenu=doc.querySelector('#v481MoreGroup .v481-interface-actions');\n  if(recoveryMenu&&!doc.getElementById('v482ShipRecoveryBtn')){\n    const restore=doc.createElement('button');\n    restore.id='v482ShipRecoveryBtn';restore.type='button';\n    restore.className='menu-item';restore.textContent='↗ REABRIR PAINEL NAVE';\n    restore.addEventListener('click',()=>{\n      if(ship.classList.contains('collapsed'))doc.getElementById('statsToggle')?.click();\n      ship.scrollIntoView({behavior:'smooth',block:'nearest',inline:'center'});\n      const menu=doc.getElementById('v481MoreGroup');menu?.classList.remove('open');\n      menu?.querySelector('[data-menu-toggle="more"]')?.setAttribute('aria-expanded','false');\n    });\n    recoveryMenu.appendChild(restore);\n  }\n`;
let css=fs.readFileSync(cssFile,'utf8');
let js=fs.readFileSync(jsFile,'utf8');
if(!css.includes(signature)){fs.writeFileSync(cssFile,css.trimEnd()+'\n'+cssPatch);console.log('CSS corrigido: botão N restaurado, CONF 1/2 ocultos ao recolher.');}
else console.log('CSS já corrigido.');
if(!js.includes(signature)){
  const marker="  player.dataset.v482Ready='1';ship.dataset.v482Ready='1';";
  if(!js.includes(marker))throw new Error('A estrutura de pilot-ship-hud-v482.js mudou. Não alterar automaticamente; revisar integração.');
  js=js.replace(marker,recoveryJs+marker);
  fs.writeFileSync(jsFile,js);
  console.log('Atalho de recuperação adicionado em MAIS > INTERFACE / HUD.');
}else console.log('Atalho já integrado.');
console.log('Hotfix aplicado nos arquivos locais. Ainda exige versionamento, testes e deploy posterior.');
