export class SharedUniverseClient {
  constructor({getCredentials,onMessage,onStatus}){
    this.getCredentials=getCredentials;this.onMessage=onMessage||(()=>{});this.onStatus=onStatus||(()=>{});
    this.ws=null;this.authed=false;this.manual=false;this.pendingJoin=null;this.reconnectTimer=null;this.pingTimer=null;this.latency=0;this.lastPing=0;this.lastRxAt=0;this.mapJoinError=null;
    // STELLAR_NETWORK_RECOVERY_V4831: stale sockets can remain OPEN during network handoffs on Android.
    this.watchdogTimer=null;this.reconnectAttempts=0;this.failedAuthToken=null;this.lastConnectAt=0;
    this.resumeListener=()=>this.recover();
    if(typeof window!=='undefined')window.addEventListener('online',this.resumeListener);
    if(typeof document!=='undefined')document.addEventListener('visibilitychange',()=>{
      if(document.visibilityState==='visible')this.recover();
    });
  }
  status(state,extra={}){this.onStatus({state,latency:this.latency,...extra});}
  url(){const proto=location.protocol==='https:'?'wss:':'ws:';return `${proto}//${location.host}/ws`;}
  // STELLAR_NETWORK_RECOVERY_V4831: reconnect only after detecting a stale session, not on every missed frame.
  clearPulse(){clearInterval(this.pingTimer);clearInterval(this.watchdogTimer);this.pingTimer=null;this.watchdogTimer=null;}
  scheduleReconnect(delay=null){
    if(this.manual||this.failedAuthToken===this.getCredentials?.()?.accessToken)return;
    clearTimeout(this.reconnectTimer);
    const wait=delay===null?Math.min(12000,700*(2**Math.min(5,this.reconnectAttempts++))):delay;
    this.reconnectTimer=setTimeout(()=>{this.reconnectTimer=null;this.connect();},wait);
  }
  stale(){
    if(!this.ws)return true;
    const age=Date.now()-(this.lastRxAt||this.lastConnectAt||Date.now());
    return age>18000;
  }
  recover(){
    if(this.manual||typeof document!=='undefined'&&document.visibilityState==='hidden')return;
    const current=this.ws;
    if(current&&(current.readyState===WebSocket.OPEN||current.readyState===WebSocket.CONNECTING)){
      if(!this.stale())return;
      this.clearPulse();this.authed=false;this.ws=null;
      try{current.close(4000,'stale connection');}catch{}
      this.status('reconnecting');this.scheduleReconnect(0);return;
    }
    clearTimeout(this.reconnectTimer);this.reconnectTimer=null;this.connect();
  }
  connect(){
    if(this.manual)return;
    if(this.ws&&[WebSocket.OPEN,WebSocket.CONNECTING].includes(this.ws.readyState))return;
    const c=this.getCredentials?.()||{};
    if(!c.accessToken||!c.gameSessionId){this.status('auth_error');return;}
    if(this.failedAuthToken===c.accessToken){this.status('auth_error');return;}
    this.status('connecting');this.lastConnectAt=Date.now();this.lastRxAt=this.lastConnectAt;this.authed=false;
    let ws;try{ws=new WebSocket(this.url());}catch{this.status('reconnecting');this.scheduleReconnect();return;}
    this.ws=ws;
    this.clearPulse();
    this.watchdogTimer=setInterval(()=>{
      if(this.ws===ws&&(!this.manual)&&!(typeof document!=='undefined'&&document.visibilityState==='hidden')&&this.stale())this.recover();
    },5000);
    ws.onopen=()=>{if(this.ws!==ws)return;const auth=this.getCredentials?.()||{};
      try{ws.send(JSON.stringify({type:'auth',accessToken:auth.accessToken||'',gameSessionId:auth.gameSessionId||''}));}
      catch{this.recover();}
    };
    ws.onmessage=e=>{if(this.ws!==ws)return;
      this.lastRxAt=Date.now();let msg;try{msg=JSON.parse(e.data);}catch{return;}
      if(msg.type==='auth_ok'){
        this.authed=true;this.failedAuthToken=null;this.reconnectAttempts=0;this.status('online');
        if(this.pendingJoin)this.join(this.pendingJoin,true);
        clearInterval(this.pingTimer);this.pingTimer=setInterval(()=>this.ping(),3000);this.ping();return;
      }
      if(msg.type==='auth_error'){
        // Real auth denial is terminal until credentials change; no login-flood loop.
        this.failedAuthToken=(this.getCredentials?.()||{}).accessToken||null;
        this.authed=false;this.status('auth_error');try{ws.close(4401,'auth failed');}catch{}return;
      }
      if(msg.type==='pong'){this.latency=Math.max(0,Date.now()-Number(msg.ts||Date.now()));if(!this.mapJoinError)this.status('online');return;}
      if(msg.type==='join_error'){this.mapJoinError={code:String(msg.code||'MAP_JOIN_ERROR'),reason:String(msg.reason||'Falha ao entrar no mapa')};this.status('map_error',this.mapJoinError);this.onMessage(msg);return;}
      if(msg.type==='world_snapshot'){this.mapJoinError=null;this.status('online');}
      this.onMessage(msg);
    };
    ws.onclose=()=>{if(this.ws!==ws)return;
      this.clearPulse();this.ws=null;this.authed=false;this.mapJoinError=null;
      if(this.manual){this.status('offline');return;}
      if(this.failedAuthToken===(this.getCredentials?.()||{}).accessToken){this.status('auth_error');return;}
      this.status('reconnecting');this.scheduleReconnect();
    };
    ws.onerror=()=>{if(this.ws===ws)this.status('reconnecting');};
  }
  send(payload){if(!this.authed||this.ws?.readyState!==WebSocket.OPEN)return false;try{this.ws.send(JSON.stringify(payload));return true;}catch{return false;}}
  ping(){if(!this.send({type:'ping',ts:Date.now()}))return;this.lastPing=Date.now();}
  join(payload,fromAuth=false){this.mapJoinError=null;this.pendingJoin={...payload};if(!this.authed){this.manual=false;this.connect();return false;}return this.send({type:'join_map',...payload});}
  updatePlayer(payload){return this.send({type:'player_state',...payload});}
  damageNpc(payload){return this.send({type:'npc_damage',...payload});}
  attackRelay(nodeId){return this.send({type:'relay_attack',nodeId});}
  collectOre(entityId,collector='ship'){return this.send({type:'collect_ore',entityId,collector:collector==='pet'?'pet':'ship'});}
  forceEvent(index){return this.send({type:'force_event',index});}
  close(){this.mapJoinError=null;this.manual=true;clearTimeout(this.reconnectTimer);this.clearPulse();this.reconnectTimer=null;try{this.ws?.close(1000,'logout');}catch{}this.ws=null;this.authed=false;this.status('offline');}
  isOnline(){return !!this.authed&&this.ws?.readyState===WebSocket.OPEN;}
}
