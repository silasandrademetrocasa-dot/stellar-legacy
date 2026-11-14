// Transport-only adapter: business functions and tables are the actual PostgreSQL fixture.
export function supabasePgliteV134(db,{beforeRpc=async()=>{}}={}){
 return {
  rpc:async(name,args)=>{await beforeRpc(name,args);try{const keys=Object.keys(args),r=await db.query('SELECT public.'+name+'('+keys.map((k,i)=>k+'=> $'+(i+1)).join(',')+') r',Object.values(args));return {data:r.rows[0].r,error:null};}catch(e){return {data:null,error:{message:e.message,code:e.code}};}},
  from(table){let columns='*',filters=[],single=false;const builder={
   select(value){columns=value;return builder;},eq(k,v){filters.push([k,'=',v]);return builder;},in(k,v){filters.push([k,'=ANY',v]);return builder;},gt(k,v){filters.push([k,'>',v]);return builder;},single(){single=true;return builder;},maybeSingle(){single=true;return builder;},
   then(resolve,reject){return db.query('SELECT '+columns+' FROM public.'+table+(filters.length?' WHERE '+filters.map(([k,op],i)=>k+(op==='=ANY'?'=ANY($'+(i+1)+')':op+'$'+(i+1))).join(' AND '):''),filters.map(x=>x[2])).then(r=>resolve({data:single?r.rows[0]||null:r.rows,error:null}),e=>resolve({data:null,error:e})).catch(reject);}
  };return builder;}
 };
}
