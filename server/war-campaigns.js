// Guerra de Facções: projeções somente leitura; ações e resgates são autorizados no banco.
const FACTIONS=['earth','mars','jupiter'];
export function warCampaignState(row,now=Date.now()){
 if(!row?.enabled)return 'rascunho';
 const start=Date.parse(row.starts_at),end=Date.parse(row.ends_at);
 return now<start?'agendada':now>=end?'encerrada':'ativa';
}
export function warRankings(campaign,rawScores=[],members=[],clans=[]){
 const scores=(rawScores||[]).filter(s=>s.campaign_id===campaign?.id).map(s=>({
  userId:s.user_id,faction:s.faction,points:Math.max(0,Number(s.points)||0),captures:Math.max(0,Number(s.captures)||0),defenses:Math.max(0,Number(s.defenses)||0)
 }));
 const factions=FACTIONS.map(faction=>({faction,points:scores.filter(s=>s.faction===faction).reduce((n,s)=>n+s.points,0),pilots:scores.filter(s=>s.faction===faction).length})).sort((a,b)=>b.points-a.points||a.faction.localeCompare(b.faction));
 const byUser=new Map((members||[]).map(m=>[m.user_id,m.clan_id]));
 const byClan=new Map((clans||[]).map(c=>[c.id,c]));
 const clanScores=new Map();
 for(const s of scores){const clanId=(rawScores||[]).find(row=>row.campaign_id===campaign?.id&&row.user_id===s.userId)?.clan_id||byUser.get(s.userId);if(!clanId||!byClan.has(clanId))continue;const value=clanScores.get(clanId)||{id:clanId,tag:byClan.get(clanId).tag,name:byClan.get(clanId).name,points:0,pilots:0};value.points+=s.points;value.pilots++;clanScores.set(clanId,value);}
 const topPilots=[...scores].sort((a,b)=>b.points-a.points||a.userId.localeCompare(b.userId)).slice(0,30).map((s,index)=>({rank:index+1,faction:s.faction,points:s.points,captures:s.captures,defenses:s.defenses,userId:s.userId}));
 return {factions,clans:[...clanScores.values()].sort((a,b)=>b.points-a.points).slice(0,15),pilots:topPilots};
}
export function safeWarCampaignInput(body={}){
 const title=String(body.title||'').trim(),start=new Date(body.starts_at),end=new Date(body.ends_at);
 const minPoints=Number(body.min_points),credits=Number(body.reward_credits),stl=Number(body.reward_stl);
 if(title.length<3||title.length>70||!Number.isFinite(start.getTime())||!Number.isFinite(end.getTime())||end-start<=300000||end-start>31*86400000||start.getTime()<Date.now()-60000)throw new Error('Datas ou nome de campanha inválidos.');
 if(!Number.isSafeInteger(minPoints)||minPoints<1||minPoints>10000||!Number.isSafeInteger(credits)||credits<0||credits>10000||!Number.isSafeInteger(stl)||stl<0||stl>50)throw new Error('Pontuação ou prêmios fora dos limites.');
 return {title,starts_at:start.toISOString(),ends_at:end.toISOString(),min_points:minPoints,reward_credits:credits,reward_stl:stl,enabled:body.enabled===true};
}
export function safeWarRulesInput(body={}){
 const keys={daily_credits_per_node:[0,2000],daily_credits_cap:[0,10000],capture_points:[1,100],defense_points:[1,50]},out={};
 for(const [key,[min,max]] of Object.entries(keys)){const v=Number(body[key]);if(!Number.isSafeInteger(v)||v<min||v>max)throw new Error('Configuração inválida: '+key);out[key]=v;}
 return out;
}
