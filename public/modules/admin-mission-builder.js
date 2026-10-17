// V20.3.0 — modelos e validação do editor visual ADM.
// Funções puras: não publicam missões, não alteram saves e não acessam a rede.
const VALID_CATEGORIES = new Set(['daily','weekly','monthly','special']);
const VALID_TYPES = new Set(['kill','ore']);

export const ADMIN_MISSION_PRESETS = Object.freeze([
  {id:'patrol',title:'PATRULHA NPC'},
  {id:'mining',title:'COLETA MINÉRIO'},
  {id:'mixed',title:'EXPEDIÇÃO MISTA'}
]);

function validId(value){return /^[A-Za-z0-9_-]{1,80}$/.test(String(value||''));}
function safeNumber(value,max){const n=Number(value);return Number.isFinite(n)&&Number.isInteger(n)&&n>=0&&n<=max;}

export function createAdminMissionPreset(preset, {npcIds=[],oreIds=[]}={}){
  const npc=String(npcIds[0]||'streuner');
  const ore=String(oreIds[0]||'Prometium');
  const choices={
    patrol:{title:'Patrulha do setor',description:'Elimine ameaças no setor para garantir a segurança das rotas.',category:'daily',tasks:[{type:'kill',npc,target:15}]},
    mining:{title:'Coleta estratégica',description:'Colete recursos para reforçar o abastecimento da facção.',category:'weekly',tasks:[{type:'ore',resource:ore,target:30}]},
    mixed:{title:'Expedição especial',description:'Neutralize ameaças e recupere recursos do setor.',category:'special',tasks:[{type:'kill',npc,target:20},{type:'ore',resource:ore,target:20}]}
  };
  const selected=choices[preset]||choices.patrol;
  return {mission_id:'',title:selected.title,description:selected.description,category:selected.category,reward_factor:1,flat_reward:{credits:0,uridium:0,xp:0},tasks:selected.tasks.map((task,index)=>({...task,id:`task_${index+1}`})),enabled:false};
}

export function duplicateAdminMission(source){
  if(!source||typeof source!=='object')throw new TypeError('Missão inválida para duplicação.');
  const tasks=Array.isArray(source.tasks)?source.tasks.slice(0,8).map((task,index)=>({...task,id:`task_${index+1}`})):[];
  return {
    mission_id:'', title:`${String(source.title||'Nova missão').slice(0,90)} (cópia)`.slice(0,100),
    description:String(source.description||'').slice(0,260), category:VALID_CATEGORIES.has(source.category)?source.category:'special',
    reward_factor:Number(source.reward_factor??1),flat_reward:{credits:Number(source.flat_reward?.credits||0),uridium:Number(source.flat_reward?.uridium||0),xp:Number(source.flat_reward?.xp||0)},
    tasks,enabled:false
  };
}

export function validateAdminMissionDraft(draft,{npcIds=null,oreIds=null}={}){
  const errors=[];const d=draft||{};
  if(!/^[A-Za-z0-9_-]{1,32}$/.test(String(d.mission_id||'')))errors.push('Informe um ID único com 1 a 32 letras, números, _ ou -.');
  if(!String(d.title||'').trim()||String(d.title).length>100)errors.push('Informe o título com até 100 caracteres.');
  if(String(d.description||'').length>260)errors.push('A descrição deve ter até 260 caracteres.');
  if(!VALID_CATEGORIES.has(d.category))errors.push('Escolha uma categoria válida.');
  if(!Number.isFinite(Number(d.reward_factor))||Number(d.reward_factor)<0||Number(d.reward_factor)>10)errors.push('O multiplicador deve estar entre 0 e 10.');
  for(const [key,max,label] of [['credits',100000000,'Créditos'],['uridium',100000,'STL'],['xp',10000000,'XP']]){
    if(!safeNumber(d.flat_reward?.[key],max))errors.push(`${label}: informe um inteiro de 0 a ${max}.`);
  }
  if(!Array.isArray(d.tasks)||d.tasks.length<1||d.tasks.length>8){errors.push('Informe de 1 a 8 objetivos.');return errors;}
  for(const [index,task] of d.tasks.entries()){
    if(!VALID_TYPES.has(task?.type)){errors.push(`Objetivo ${index+1}: tipo inválido.`);continue;}
    const key=task.type==='ore'?'resource':'npc',ids=task.type==='ore'?oreIds:npcIds;
    if(!validId(task[key])||(Array.isArray(ids)&&!ids.includes(task[key])))errors.push(`Objetivo ${index+1}: selecione um alvo existente.`);
    if(!Number.isInteger(Number(task.target))||Number(task.target)<1||Number(task.target)>1000000)errors.push(`Objetivo ${index+1}: quantidade de 1 a 1.000.000.`);
  }
  return errors;
}

export function previewAdminMission(draft,{npcNames={},oreNames={}}={}){
  const d=draft||{};
  const categoryLabels={daily:'Diária',weekly:'Semanal',monthly:'Mensal',special:'Especial'};
  const objectives=(Array.isArray(d.tasks)?d.tasks:[]).map(task=>{
    const name=task?.type==='ore'?(oreNames[task.resource]||task.resource):(npcNames[task?.npc]||task?.npc);
    return `${task?.type==='ore'?'Coletar':'Eliminar'} ${Number(task?.target)||0} × ${String(name||'alvo')}`;
  });
  return {
    category:categoryLabels[d.category]||'Categoria inválida',
    title:String(d.title||'Missão sem título'),
    status:d.enabled?'Ativa após publicação':'Inativa até você ativar',
    objectives,
    rewards:`Bônus x${Number(d.reward_factor)||0} • ${Number(d.flat_reward?.credits)||0} CR • ${Number(d.flat_reward?.uridium)||0} STL • ${Number(d.flat_reward?.xp)||0} XP`
  };
}
