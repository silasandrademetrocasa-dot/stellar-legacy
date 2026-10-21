#!/usr/bin/env node
// V42.1 incremental companion for the V39–V42 installer patch. Safe to rerun.
import {readFileSync,writeFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const update=(p,fn)=>{const path=resolve(ROOT,p),src=readFileSync(path,'utf8'),out=fn(src);if(src!==out)writeFileSync(path,out,'utf8')};
const ensure=(value,anchor,filename)=>{if(!value.includes(anchor))throw Error(`V42.1: ponto de integração ausente em ${filename}: ${anchor.slice(0,60)}`)};
update('server/index.js',src=>{
 if(!src.includes("from './squad-objectives-v421.js'"))src="import {attachSquadObjectivesV421} from './squad-objectives-v421.js';\n"+src;
 src=src.replace("const RELEASE_VERSION = '42.0.0'","const RELEASE_VERSION = '42.1.0'");
 ensure(src,"const RELEASE_VERSION = '42.1.0'",'server/index.js');
 if(!src.includes('attachSquadObjectivesV421(app,')){
  const anchor='// V19.0.9 • Catálogo único de balanceamento validado pelo Supabase.';
  ensure(src,anchor,'server/index.js');
  src=src.replace(anchor,`// V42.1: objetivo semanal de esquadrão baseado em abates confirmados.\nattachSquadObjectivesV421(app,{requireUser,asyncRoute});\n\n${anchor}`);
 }
 return src;
});
update('public/api.js',src=>{
 if(src.includes('export async function loadSquadObjectiveV421()'))return src;
 ensure(src,'async function authedServerFetch(','public/api.js');
 return src+`\n// V42.1 — objetivo semanal cooperativo: dados e resgate autoritativos.\nexport async function loadSquadObjectiveV421(){return authedServerFetch('/api/frontier/v421/squad-objective');}\nexport async function claimSquadObjectiveV421(){return authedServerFetch('/api/frontier/v421/squad-objective/claim',{method:'POST',body:'{}'});}\nexport async function adminSquadObjectiveV421(goal,minimumPersonal,rewardResearch){return authedServerFetch('/api/admin/frontier/v421/squad-objective',{method:'POST',body:JSON.stringify({goal,minimumPersonal,rewardResearch})});}\n`;
});
update('public/index.html',src=>{
 src=src.replaceAll('?v=42.0.0','?v=42.1.0');
 ensure(src,'/game.js?v=42.1.0','public/index.html');
 ensure(src,'/style.css?v=42.1.0','public/index.html');
 return src;
});
update('public/game.js',src=>src.replaceAll('?v=42.0.0','?v=42.1.0'));
update('public/modules/unified-expansion-v42.js',src=>{
 if(!src.includes("from '../api.js';"))throw Error('V42.1: frontend API ausente');
 if(!src.includes('loadSquadObjectiveV421')){
  src=src.replace("from '../api.js';",`from '../api.js';\nimport {loadSquadObjectiveV421,claimSquadObjectiveV421,adminSquadObjectiveV421} from '../api.js';`);
 }
 if(!src.includes("if(tab==='war')void v421ObjectiveRender(root);")){
  const anchor="root.querySelectorAll('[data-v42-tab]')";
  ensure(src,anchor,'public/modules/unified-expansion-v42.js');
  src=src.replace(anchor,`if(tab==='war')void v421ObjectiveRender(root);\nif(tab==='admin' && snapshot?.isAdmin)void v421AdminRender(root);\n${anchor}`);
 }
 if(!src.includes('async function v421ObjectiveRender('))src+=`\n// V42.1: renderização somente sob demanda, fora do loop Canvas.\nasync function v421ObjectiveRender(root){\n const card=document.createElement('section');card.className='frontier-card-v42 frontier-objective-v421';card.textContent='Carregando objetivo semanal do esquadrão…';root.append(card);\n try{\n  const p=await loadSquadObjectiveV421();if(!card.isConnected)return;\n  if(!p.inSquad){card.textContent='OBJETIVO SEMANAL — Entre em um esquadrão para participar.';return;}\n  const total=Number(p.verifiedKills||0),goal=Number(p.goal||100),mine=Number(p.personalKills||0),min=Number(p.minimumPersonal||10);\n  const line=document.createElement('div');line.textContent='OBJETIVO SEMANAL DE ESQUADRÃO';line.style.fontWeight='bold';\n  const desc=document.createElement('p');desc.textContent=total+' / '+goal+' abates confirmados · Seus: '+mine+' / '+min+' · Recompensa: '+Number(p.rewardResearch||0)+' pontos de pesquisa.';\n  const status=document.createElement('small');status.textContent=p.claimed?'Resgatado nesta semana.':p.eligible?'Missão concluída — resgate disponível.':'Elimine NPCs com seu esquadrão para liberar o resgate.';\n  card.replaceChildren(line,desc,status);\n  if(Array.isArray(p.team)){for(const member of p.team){const row=document.createElement('div');row.textContent=(member.callsign||'Piloto')+' — '+Number(member.kills||0)+' abates';card.append(row);}}\n  if(p.eligible){const button=document.createElement('button');button.type='button';button.textContent='RESGATAR PESQUISA DO ESQUADRÃO';card.append(button);button.addEventListener('click',async()=>{button.disabled=true;try{const claimed=await claimSquadObjectiveV421();if(!claimed?.ok)throw Error('Resgate indisponível.');await refresh();}catch(error){alert(error?.message||String(error));button.disabled=false;}});}\n }catch(err){if(card.isConnected)card.textContent='Objetivo semanal indisponível: '+String(err?.message||err);}\n}\nasync function v421AdminRender(root){\n const card=document.createElement('section');card.className='frontier-card-v42';card.textContent='Carregando controle da missão semanal…';root.append(card);\n try{const p=await loadSquadObjectiveV421();if(!card.isConnected)return;card.replaceChildren();\n const title=document.createElement('h4');title.textContent='V42.1 — OBJETIVOS DE ESQUADRÃO';card.append(title);\n const fields=[['Abates do esquadrão',p.goal,20,10000],['Abates mínimos por piloto',p.minimumPersonal,1,1000],['Pontos de pesquisa',p.rewardResearch,1,1000]];\n const inputs=[];for(const [name,value,min,max] of fields){const label=document.createElement('label');label.textContent=name+' ';const input=document.createElement('input');input.type='number';input.min=min;input.max=max;input.value=value;input.className='frontier-input-v42';label.append(input);card.append(label,document.createElement('div'));inputs.push(input);} \n const save=document.createElement('button');save.type='button';save.textContent='SALVAR OBJETIVO SEMANAL';card.append(save);\n save.addEventListener('click',async()=>{save.disabled=true;try{const [goal,min,reward]=inputs.map(i=>Number(i.value));const r=await adminSquadObjectiveV421(goal,min,reward);if(!r?.ok)throw Error('Configuração não aceita.');await refresh();}catch(err){alert(err?.message||String(err));save.disabled=false;}});\n }catch(err){if(card.isConnected)card.textContent='Admin de objetivos indisponível: '+String(err?.message||err);}\n}\n`;
 return src;
});
update('public/style.css',src=>src.includes('/* SQUAD_OBJECTIVES_V421 */')?src:src+`\n/* SQUAD_OBJECTIVES_V421 */\n.frontier-objective-v421{border-color:#74b5e9}\n.frontier-objective-v421 div{margin:3px 0}\n.frontier-objective-v421 button{max-width:100%;white-space:normal}\n`);
console.log('V42.1: objetivo semanal de esquadrões integrado.');
