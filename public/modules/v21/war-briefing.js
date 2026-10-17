// V21.2 — Resumo TÁTICO SOMENTE LEITURA de dados existentes no Shared Universe.
const FACTION_NAMES={earth:'TERRA',mars:'MARTE',jupiter:'JÚPITER'};
function safeNumber(value){const n=Number(value);return Number.isFinite(n)&&n>=0?n:0;}
export function deriveWarBriefing({faction='',map='',worldReady=false,warfront=null,boss=null,clanWar=null,clan=null}={}){
 const scores=warfront?.scores||{};
 const nodes=Array.isArray(warfront?.nodes)?warfront.nodes.slice(0,6).map(x=>({id:String(x?.id||'?'),label:String(x?.label||x?.id||'Ponto'),owner:FACTION_NAMES[String(x?.owner||'').toLowerCase()]||'NEUTRO',progress:Math.max(0,Math.min(100,safeNumber(x?.progress))),contested:!!x?.contested})):[];
 const controls=Object.entries(FACTION_NAMES).map(([key,label])=>({key,label,score:safeNumber(scores[key])}));
 const active=Boolean(clanWar&&['active','ongoing','declared','live'].includes(String(clanWar.status||'active').toLowerCase()));
 const hp=safeNumber(boss?.hp),maxHp=Math.max(1,safeNumber(boss?.max_hp)||1);
 return {
  faction:FACTION_NAMES[String(faction).toLowerCase()]||'NÃO DEFINIDA',map:String(map||'—').toUpperCase(),
  worldReady:!!worldReady,controls,nodes,dominatingFaction:FACTION_NAMES[warfront?.dominantFaction]||null,
  battleMap:!!warfront,clanName:String(clan?.name||clan?.tag||'SEM CLÃ'),
  clanWarActive:active,clanWarStatus:clanWar?String(clanWar.status||'ATIVA'):'SEM GUERRA ATIVA',
  boss:boss?{name:String(boss.name||'Chefe mundial'),hp,maxHp,pct:Math.round(hp/maxHp*100),defeated:hp===0}:null
 };
}
