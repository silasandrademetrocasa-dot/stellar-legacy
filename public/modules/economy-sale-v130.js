/** V130: sales are authoritative on the server; UI-only pending saves must not block trading. */
const SERVER_FIRST = new Set(['sell_cargo','sell_inventory']);
export function economyServerFirstV130(action){return SERVER_FIRST.has(String(action||''));}
export function shouldRetrySaleV130(error){
 const status=Number(error?.status)||0;
 const code=String(error?.code||'');
 return status>=500 || ['NETWORK_TIMEOUT','NETWORK_OFFLINE','ECONOMY_ACK_UNKNOWN','ECONOMY_RPC_UNAVAILABLE'].includes(code)
    || (status===0 && /network|fetch|timeout|conex|rede|servidor indisponível/i.test(String(error?.message||'')));
}
/** Rolling diagnostic metrics; no balances, item identifiers, tokens or player identities. */
export function createEconomyTimingsV130({now=()=>performance.now(),max=40}={}){
 let entries=[];
 return {
   start:()=>now(),
   finish:(started,{action,ok,code,serverMs=null,retried=false}={})=>{
     const durationMs=Math.max(0,Math.round(now()-started));
     const row={action:action==='sell_cargo'?'cargo':action==='sell_inventory'?'inventory':'other',ok:ok===true,code:String(code||'').slice(0,50),clientMs:durationMs,serverMs:Number.isFinite(Number(serverMs))?Math.max(0,Math.round(Number(serverMs))):null,retried:retried===true};
     entries.push(row);if(entries.length>max)entries.shift();return row;
   },
   snapshot:()=>entries.map(x=>({...x})),
   clear:()=>{entries=[];}
 };
}
