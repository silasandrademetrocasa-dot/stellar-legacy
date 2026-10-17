// Apenas conquistas e defesas verificadas pelo servidor. Não aceita contadores de cliente.
export function clanOperationProgress(objectives=[],claims=[],totals={}){
 const claimed=new Set((claims||[]).map(x=>String(x.operation_id)));
 return (objectives||[]).filter(x=>x.enabled).sort((a,b)=>Number(a.sort_order)-Number(b.sort_order))
  .map(o=>({id:o.id,title:o.title,metric:o.metric,target:o.target,progress:Math.min(Math.max(0,Number(totals[o.metric])||0),Number(o.target)||0),total:Math.max(0,Number(totals[o.metric])||0),vaultCredits:o.vault_credits,claimed:claimed.has(o.id),claimable:!claimed.has(o.id)&&(Number(totals[o.metric])||0)>=Number(o.target)}));
}

export function safeClanOperationDraft(raw={}){
 const id=String(raw.id||'').trim(),title=String(raw.title||'').trim();
 const metric=String(raw.metric||''),target=Number(raw.target),vault_credits=Number(raw.vault_credits);
 if(!/^[a-z][a-z0-9_]{2,39}$/.test(id)||title.length<3||title.length>80||!['capture','defense'].includes(metric))throw new Error('Missão coletiva inválida.');
 if(!Number.isSafeInteger(target)||target<1||target>10000||!Number.isSafeInteger(vault_credits)||vault_credits<0||vault_credits>1000000)throw new Error('Metas ou recompensa fora dos limites.');
 const sort_order=Number(raw.sort_order);
 if(!Number.isInteger(sort_order)||sort_order<0||sort_order>10000)throw new Error('Ordem inválida.');
 return {id,title,metric,target,vault_credits,sort_order,enabled:raw.enabled===true};
}
