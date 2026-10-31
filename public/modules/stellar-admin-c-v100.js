/** V98–V100: optional, read-only ADM controls. No changes to multiplayer/save/Live Ops. */
import {getSessionCredentials} from '../api.js?v=47.7.60';
let reference=null;
const $=id=>document.getElementById(id);
const out=(id,message)=>{const el=$(id);if(el)el.textContent=String(message||'');};
async function request(path){
 const creds=getSessionCredentials();
 if(!creds?.accessToken||!creds?.gameSessionId)throw Error('Faça login novamente para consultar a auditoria.');
 const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),18000);
 try{
  const response=await fetch(path,{method:'GET',headers:{Authorization:`Bearer ${creds.accessToken}`,'X-Game-Session-Id':creds.gameSessionId},cache:'no-store',signal:controller.signal});
  const result=await response.json();if(!response.ok||result.ok!==true)throw Error(result.error||'Resposta não confirmada pelo servidor');
  return result;
 }finally{clearTimeout(timeout);}
}
const run=async(id,button,handler)=>{
 if(!button||button.disabled)return;
 button.disabled=true;out(id,'Consultando o Render e o Supabase...');
 try{out(id,await handler());}
 catch(e){out(id,'Consulta não confirmada: '+String(e?.message||e));}
 finally{button.disabled=false;}
};
export function competitiveAuditTextV98(report){
 const s=report.summary||{};
 const alerts=report.alerts||[];
 return [
  `ARENA: ${s.arenaBattles||0} batalhas históricas • ${s.pvpDamageEvents||0} eventos PvP`,
  `CLÃS: ${s.clans||0} clãs • ${s.clanMembers||0} membros`,
  `WARFRONT: ${s.warNodes||0} nós • ${s.warActions||0} ações • ${s.activeCampaigns||0} campanhas em andamento`,
  `RELÉS: ${s.relayCount||0} estações consultadas`,
  `ALERTAS: ${alerts.length?alerts.map(a=>a.message).join(' | '):'Nenhum problema estrutural detectado na amostra'}`,
  'Consulta informativa: não substitui teste PvP e multisessão no dispositivo.'
 ].join('\n');
}
function diffSections(a={},b={}){
 const sections=new Set([...Object.keys(a.sections||{}),...Object.keys(b.sections||{})]);
 return [...sections].filter(k=>JSON.stringify(a.sections?.[k])!==JSON.stringify(b.sections?.[k])).sort();
}
function bind(){
 $('v98CompetitiveAuditBtn')?.addEventListener('click',e=>run('v98CompetitiveAuditOutput',e.currentTarget,async()=>competitiveAuditTextV98(await request('/api/admin/v98/competitive-audit'))));
 $('v99SnapshotBtn')?.addEventListener('click',e=>run('v99SnapshotOutput',e.currentTarget,async()=>{
  reference=await request('/api/admin/v99/liveops-snapshot');
  const sizes=Object.entries(reference.sections||{}).map(([k,v])=>`${k}: ${v.length}`).join(' • ');
  return `Referência nesta sessão: ${reference.generatedAt}\nSHA-256: ${reference.sha256}\n${sizes}\n${reference.warnings?.join(' | ')||'Todas as consultas respondidas.'}\nNenhuma alteração feita no Supabase.`;
 }));
 $('v99CompareBtn')?.addEventListener('click',e=>run('v99SnapshotOutput',e.currentTarget,async()=>{
  if(!reference)throw Error('Primeiro capture uma referência nesta sessão.');
  const latest=await request('/api/admin/v99/liveops-snapshot');
  const diff=diffSections(reference,latest);
  return `REFERÊNCIA: ${reference.sha256}\nAGORA: ${latest.sha256}\n${diff.length?`Seções diferentes: ${diff.join(', ')}`:'Nenhuma diferença detectada'}\n${latest.warnings?.join(' | ')||''}\nNenhuma configuração foi publicada por esta comparação.`;
 }));
 $('v99ExportBtn')?.addEventListener('click',e=>run('v99SnapshotOutput',e.currentTarget,async()=>{
  if(!reference)throw Error('Capture uma referência antes da exportação.');
  const text=JSON.stringify(reference,null,2);
  if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(text);return `Snapshot copiado para a área de transferência. SHA-256: ${reference.sha256}`;}
  const area=document.createElement('textarea');area.value=text;area.readOnly=true;area.style.cssText='position:fixed;inset:20%;z-index:100000;background:#081e2b;color:white;';
  document.body.appendChild(area);area.focus();area.select();document.execCommand('copy');area.remove();
  return `Cópia solicitada. SHA-256: ${reference.sha256}. Confira a área de transferência do Android.`;
 }));
 $('v100ReadinessBtn')?.addEventListener('click',e=>run('v100ReadinessOutput',e.currentTarget,async()=>{
  const report=await request('/api/admin/v100/readiness');
  return `${report.version} • Pré-checagem ${report.pass?'estrutural aprovada':'com pendências'}\n`+
    (report.checks||[]).map(c=>`${c.ok?'OK':'FALTA'} • ${c.name} (${c.bytes||0} bytes)`).join('\n')+`\n`+
    `Pendências: ${(report.failures||[]).join(' | ')||'nenhuma estrutural'}\n\nVALIDAÇÕES HUMANAS AINDA OBRIGATÓRIAS:\n`+
    (report.manualAcceptanceRequired||[]).map(x=>'• '+x).join('\n');
 }));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
