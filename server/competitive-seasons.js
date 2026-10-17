// Centro de Comando • Temporadas e universo. Regras puras para testes sem Supabase.
export const FACTIONS = Object.freeze(['earth','mars','jupiter']);
export function seasonStatus(s, now=Date.now()) {
  if (!s?.enabled) return 'rascunho';
  const from=Date.parse(s.starts_at),to=Date.parse(s.ends_at);
  if(!Number.isFinite(from)||!Number.isFinite(to))return 'inválida';
  return now<from?'agendada':now>=to?'encerrada':'ativa';
}
export function safeSeasonDraft(raw={}) {
  const title=String(raw.title||'').trim();
  const start=Date.parse(raw.starts_at),end=Date.parse(raw.ends_at);
  const nums=['min_points','top_n','reward_credits','reward_stl'].map(k=>Number(raw[k]));
  if(title.length<3||title.length>70 || !Number.isFinite(start)||!Number.isFinite(end)||end<=start||end-start>90*86400000) throw new Error('Título ou período inválido. Máximo de 90 dias.');
  if(start<Date.now()-60000 && raw.enabled===true)throw new Error('Uma temporada nova deve começar no futuro.');
  const [min_points,top_n,reward_credits,reward_stl]=nums;
  if(!nums.every(Number.isSafeInteger)||min_points<1||min_points>10000||top_n<1||top_n>100||reward_credits<0||reward_credits>100000||reward_stl<0||reward_stl>100)throw new Error('Metas e recompensas fora dos limites.');
  return {title,starts_at:new Date(start).toISOString(),ends_at:new Date(end).toISOString(),min_points,top_n,reward_credits,reward_stl,enabled:raw.enabled===true};
}
export function safeDirective(raw={}) {
 const title=String(raw.title||'').trim(),description=String(raw.description||'').trim(),map_id=String(raw.map_id||'all');
 const category=String(raw.category||'alert'),start=Date.parse(raw.starts_at),end=Date.parse(raw.ends_at);
 if(title.length<3||title.length>80||description.length>280||!['alert','invasion','boss','resource'].includes(category)||!['all',...Array.from({length:8},(_,i)=>`x${i+1}`),'b41','b42','b43','ggAlpha','ggBeta','ggGamma'].includes(map_id))throw new Error('Aviso de universo inválido.');
 if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start||end-start>30*86400000)throw new Error('Duração inválida do evento.');
 return {title,description,category,map_id,starts_at:new Date(start).toISOString(),ends_at:new Date(end).toISOString(),enabled:raw.enabled===true};
}
export function buildSeasonRanking(pilotScores=[],clanScores=[],myUserId='') {
 // Uma pessoa pode ter historico com varias faccoes na mesma temporada.
 // Para o ranking pessoal, os eventos sao somados por usuario, tal como no RPC de premio.
 const combined=new Map();
 for(const row of pilotScores){const user=String(row.user_id||'');if(!user)continue;
  const current=combined.get(user)||{user_id:user,faction:row.faction,points:0,captures:0,defenses:0};
  const points=Math.max(0,Number(row.points)||0);
  current.points+=points;current.captures+=Math.max(0,Number(row.captures)||0);current.defenses+=Math.max(0,Number(row.defenses)||0);
  combined.set(user,current);
 }
 const pilots=[...combined.values()].sort((a,b)=>b.points-a.points||a.user_id.localeCompare(b.user_id));
 const me=pilots.findIndex(r=>r.user_id===myUserId);
 const factions=FACTIONS.map(f=>({faction:f,points:pilotScores.filter(r=>r.faction===f).reduce((sum,r)=>sum+Math.max(0,Number(r.points)||0),0)})).sort((a,b)=>b.points-a.points);
 const clans=clanScores.map(r=>({...r,points:Math.max(0,Number(r.points)||0)})).sort((a,b)=>b.points-a.points);
 return {pilots:pilots.slice(0,30).map((p,i)=>({rank:i+1,faction:p.faction,points:p.points,user_id:p.user_id,captures:p.captures,defenses:p.defenses})),factions,clans:clans.slice(0,20),myRank:me<0?null:me+1,myPoints:me<0?0:pilots[me].points};
}
