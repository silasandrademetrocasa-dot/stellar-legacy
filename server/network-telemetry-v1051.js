/* V105.1 — Contagem passiva de bytes dos payloads WebSocket.
 * Não envia pacotes adicionais, não lê tokens e não toca em saves/economia.
 * Bytes são medidos ANTES da compressão WebSocket; não equivalem à franquia Render.
 */
const MAX_TYPES=40;
function packetBytes(payload){
  if(typeof payload==='string')return Buffer.byteLength(payload);
  if(Buffer.isBuffer(payload))return payload.length;
  if(ArrayBuffer.isView(payload))return payload.byteLength;
  if(payload instanceof ArrayBuffer)return payload.byteLength;
  return Buffer.byteLength(String(payload??''));
}
function packetType(raw){
  const prefix=typeof raw==='string'?raw.slice(0,180):Buffer.isBuffer(raw)?raw.toString('utf8',0,180):null;
  if(prefix===null)return 'binary';
  // Lê apenas o início do frame, sem parsear conteúdo pessoal ou gerar JSON extra.
  const m=/["']type["']\s*:\s*["']([a-zA-Z0-9_:-]{1,48})["']/.exec(prefix);
  return m?.[1]||'other';
}
function summary(){return {messages:0,bytes:0,types:new Map()};}
function publicSummary(s, top=10){
  return {messages:s.messages,bytes:s.bytes,topTypes:[...s.types.entries()]
    .map(([type,x])=>({type,messages:x.messages,bytes:x.bytes}))
    .sort((a,b)=>b.bytes-a.bytes).slice(0,top)};
}
export function createNetworkTelemetryV1051({now=()=>Date.now(),log=console.info,periodMs=300000}={}){
  const since=now(),lifetime={inbound:summary(),outbound:summary()};
  let from=since,window={inbound:summary(),outbound:summary()};
  let timer=null;
  function record(direction,raw,type){
    const bytes=packetBytes(raw);
    const name=String(type||packetType(raw));
    const group=/^[a-zA-Z][a-zA-Z0-9_:-]{0,47}$/.test(name)?name:'other';
    for(const bucket of [lifetime[direction],window[direction]]){
      bucket.messages++;bucket.bytes+=bytes;
      const key=bucket.types.has(group)||bucket.types.size<MAX_TYPES?group:'other';
      const slot=bucket.types.get(key)||{messages:0,bytes:0};
      slot.messages++;slot.bytes+=bytes;bucket.types.set(key,slot);
    }
  }
  function snapshot(){return {since,windowStart:from,windowMs:Math.max(0,now()-from),
    lifetime:{inbound:publicSummary(lifetime.inbound),outbound:publicSummary(lifetime.outbound)},
    window:{inbound:publicSummary(window.inbound),outbound:publicSummary(window.outbound)}};}
  function flush(){
    const end=now(),durationMs=Math.max(1,end-from);
    const data={tag:'STELLAR_NETWORK_V1051',from,to:end,durationMs,
      note:'payloads_sem_compressao_WS;nao_e_banda_faturada',
      inbound:publicSummary(window.inbound),outbound:publicSummary(window.outbound),
      outboundKBps:Math.round(window.outbound.bytes/durationMs*1000/1024*100)/100};
    window={inbound:summary(),outbound:summary()};from=end;
    if(data.inbound.messages||data.outbound.messages){try{log(JSON.stringify(data));}catch{}}
    return data;
  }
  function start(){if(timer)return;timer=setInterval(flush,periodMs);timer.unref?.();}
  function stop(){if(timer){clearInterval(timer);timer=null;}}
  return {outbound:(type,wire)=>record('outbound',wire,type),inbound:(wire)=>record('inbound',wire),snapshot,flush,start,stop};
}
