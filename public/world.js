export class SharedUniverseClient {
  constructor({getCredentials,onMessage,onStatus}){
    this.getCredentials=getCredentials;this.onMessage=onMessage||(()=>{});this.onStatus=onStatus||(()=>{});
    this.ws=null;this.authed=false;this.manual=false;this.pendingJoin=null;this.reconnectTimer=null;this.pingTimer=null;this.latency=0;this.lastPing=0;this.lastRxAt=0;
  }
  status(state,extra={}){this.onStatus({state,latency:this.latency,...extra});}
  url(){const proto=location.protocol==='https:'?'wss:':'ws:';return `${proto}//${location.host}/ws`;}
  connect(){
    if(this.ws&&[WebSocket.OPEN,WebSocket.CONNECTING].includes(this.ws.readyState))return;this.manual=false;this.status('connecting');
    const ws=new WebSocket(this.url());this.ws=ws;
    ws.onopen=()=>{const c=this.getCredentials?.()||{};ws.send(JSON.stringify({type:'auth',accessToken:c.accessToken||'',gameSessionId:c.gameSessionId||''}));};
    ws.onmessage=e=>{this.lastRxAt=Date.now();let msg;try{msg=JSON.parse(e.data);}catch{return;}if(msg.type==='auth_ok'){this.authed=true;this.status('online');if(this.pendingJoin)this.join(this.pendingJoin,true);clearInterval(this.pingTimer);this.pingTimer=setInterval(()=>this.ping(),3000);this.ping();return;}if(msg.type==='auth_error'){this.status('auth_error');return;}if(msg.type==='pong'){this.latency=Math.max(0,Date.now()-Number(msg.ts||Date.now()));this.status('online');return;}this.onMessage(msg);};
    ws.onclose=()=>{this.authed=false;clearInterval(this.pingTimer);this.pingTimer=null;if(this.manual){this.status('offline');return;}this.status('reconnecting');clearTimeout(this.reconnectTimer);this.reconnectTimer=setTimeout(()=>this.connect(),700);};
    ws.onerror=()=>this.status('reconnecting');
  }
  send(payload){if(!this.authed||this.ws?.readyState!==WebSocket.OPEN)return false;try{this.ws.send(JSON.stringify(payload));return true;}catch{return false;}}
  ping(){if(!this.send({type:'ping',ts:Date.now()}))return;this.lastPing=Date.now();}
  join(payload,fromAuth=false){this.pendingJoin={...payload};if(!this.authed){this.connect();return false;}return this.send({type:'join_map',...payload});}
  updatePlayer(payload){return this.send({type:'player_state',...payload});}
  damageNpc(payload){return this.send({type:'npc_damage',...payload});}
  collectOre(entityId,collector='ship'){return this.send({type:'collect_ore',entityId,collector:collector==='pet'?'pet':'ship'});}
  forceEvent(index){return this.send({type:'force_event',index});}
  close(){this.manual=true;clearTimeout(this.reconnectTimer);clearInterval(this.pingTimer);this.reconnectTimer=null;this.pingTimer=null;try{this.ws?.close(1000,'logout');}catch{}this.ws=null;this.authed=false;this.status('offline');}
  isOnline(){return !!this.authed&&this.ws?.readyState===WebSocket.OPEN;}
}
