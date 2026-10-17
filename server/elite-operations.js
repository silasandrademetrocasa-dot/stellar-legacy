// Objetivos de Elite são definidos no banco, editáveis somente pelo ADM autenticado.
export function eliteStatus(counters={},claims=[],definitions=[]){
 const claimed=new Set(claims.map(c=>c.objective_id));
 return definitions.map(o=>({id:o.objective_id,label:o.label,title:o.title,target:o.target,
  credits:o.credits,stl:o.stl,metric:o.metric,
  value:Math.max(0,Number(counters[o.metric])||0),
  complete:(Number(counters[o.metric])||0)>=Number(o.target),claimed:claimed.has(o.objective_id)}));
}
