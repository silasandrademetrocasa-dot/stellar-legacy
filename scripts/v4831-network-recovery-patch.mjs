#!/usr/bin/env node
// Stellar Legacy V48.3.1: recovery of stalled websockets / transient HTTP failures.
// The installer runs this only against existing repo files. No SQL or save-schema changes.
import fs from 'node:fs';
import path from 'node:path';
const TAG='STELLAR_NETWORK_RECOVERY_V4831';
const root=process.cwd();
const load=p=>{const f=path.join(root,p);if(!fs.existsSync(f))throw Error('V48.3.1 missing '+p);return fs.readFileSync(f,'utf8');};
const edits=[];
function swap(s,from,to,label){
  const n=s.split(from).length-1;
  if(n!==1)throw Error('V48.3.1 '+label+': expected one exact anchor, found '+n);
  return s.replace(from,to);
}
function patch(p,transform){const before=load(p);if(before.includes(TAG)){console.log('✅ V48.3.1 already installed: '+p);return;}const after=transform(before);if(!after.includes(TAG)||after===before)throw Error('V48.3.1 patch failed: '+p);edits.push({p,after});}

patch('public/world.js',s=>{
  if(!s.includes('export class SharedUniverseClient')||!s.includes("this.reconnectTimer=setTimeout(()=>this.connect(),700)"))throw Error('V48.3.1: unexpected websocket base');
  s=swap(s,
    "this.ws=null;this.authed=false;this.manual=false;this.pendingJoin=null;this.reconnectTimer=null;this.pingTimer=null;this.latency=0;this.lastPing=0;this.lastRxAt=0;this.mapJoinError=null;",
    `this.ws=null;this.authed=false;this.manual=false;this.pendingJoin=null;this.reconnectTimer=null;this.pingTimer=null;this.latency=0;this.lastPing=0;this.lastRxAt=0;this.mapJoinError=null;
    // ${TAG}: stale sockets can remain OPEN during network handoffs on Android.
    this.watchdogTimer=null;this.reconnectAttempts=0;this.failedAuthToken=null;this.lastConnectAt=0;
    this.resumeListener=()=>this.recover();
    if(typeof window!=='undefined')window.addEventListener('online',this.resumeListener);
    if(typeof document!=='undefined')document.addEventListener('visibilitychange',()=>{
      if(document.visibilityState==='visible')this.recover();
    });`, 'network recovery state');
  const start=s.indexOf('  connect(){');const end=s.indexOf('  send(payload)',start);
  if(start<0||end<0)throw Error('V48.3.1: websocket methods not found');
  const methods=`  // ${TAG}: reconnect only after detecting a stale session, not on every missed frame.
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
`;
  s=s.slice(0,start)+methods+s.slice(end);
  s=swap(s,
    "join(payload,fromAuth=false){this.mapJoinError=null;this.pendingJoin={...payload};if(!this.authed){this.connect();return false;}return this.send({type:'join_map',...payload});}",
    "join(payload,fromAuth=false){this.mapJoinError=null;this.pendingJoin={...payload};if(!this.authed){this.manual=false;this.connect();return false;}return this.send({type:'join_map',...payload});}", 'allow new login after logout');
  s=swap(s,
    "close(){this.mapJoinError=null;this.manual=true;clearTimeout(this.reconnectTimer);clearInterval(this.pingTimer);this.reconnectTimer=null;this.pingTimer=null;try{this.ws?.close(1000,'logout');}catch{}this.ws=null;this.authed=false;this.status('offline');}",
    "close(){this.mapJoinError=null;this.manual=true;clearTimeout(this.reconnectTimer);this.clearPulse();this.reconnectTimer=null;try{this.ws?.close(1000,'logout');}catch{}this.ws=null;this.authed=false;this.status('offline');}", 'logout cleanup');
  return s;
});

patch('public/api.js',s=>{
  const helpers=`// ${TAG}: transport failure must never be mistaken for a revoked login.
function verifiedAuthDenialV4831(e){
  return !!e&&(['SESSION_REPLACED','SESSION_REQUIRED','ACCOUNT_BANNED'].includes(e.code)||[401,403].includes(Number(e.status)));
}
async function boundedFetchV4831(url,options={},duration=18000){
  const controller=new AbortController();
  let timedOut=false;
  const upstream=options.signal;
  const onAbort=()=>controller.abort();
  if(upstream){if(upstream.aborted)controller.abort();else upstream.addEventListener('abort',onAbort,{once:true});}
  const timer=setTimeout(()=>{timedOut=true;controller.abort();},duration);
  try{
    const res=await fetch(url,{...options,signal:controller.signal});
    // JSON read is also bounded; stalled response bodies must release operation locks.
    const body=await readJson(res);
    return {res,body};
  }catch(e){
    const err=new Error(timedOut?'Tempo limite de comunicação excedido.':'Conexão temporariamente indisponível.');
    err.code=timedOut?'NETWORK_TIMEOUT':'NETWORK_OFFLINE';
    if(upstream?.aborted)err.code='REQUEST_ABORTED';
    throw err;
  }finally{clearTimeout(timer);if(upstream)upstream.removeEventListener('abort',onAbort);}
}
`;
  s=swap(s,"async function serverFetch(path, options = {}, withAuth = false) {",helpers+"\nasync function serverFetch(path, options = {}, withAuth = false) {",'transport helpers');
  s=swap(s,
    `  let res;\n  try {\n    res = await fetch(path, { ...options, headers, cache: 'no-store' });\n  } catch {\n    throw new Error('Não foi possível conectar ao servidor do jogo. Tente novamente.');\n  }\n\n  const body = await readJson(res);`,
    `  const {res,body} = await boundedFetchV4831(path,{...options,headers,cache:'no-store'});`, 'game API timeout');
  s=swap(s,
    `configPromise = fetch('/api/config', { cache: 'no-store' })\n      .then(async (res) => {\n        const body = await readJson(res);`,
    `configPromise = boundedFetchV4831('/api/config',{cache:'no-store'})\n      .then(({res,body}) => {`, 'config timeout');
  s=swap(s,
    `        return {\n          url: String(body.supabaseUrl).replace(/\\/+$/, ''),\n          key: String(body.supabasePublishableKey),\n        };\n      });`,
    `        return {\n          url: String(body.supabaseUrl).replace(/\\/+$/, ''),\n          key: String(body.supabasePublishableKey),\n        };\n      }).catch(e=>{configPromise=null;throw e;});`, 'config retries');
  s=swap(s,
    `  let res;\n  try {\n    res = await fetch(\`\u0024{url}\u0024{path}\`, { ...options, headers });\n  } catch (err) {\n    throw new Error('Seu navegador não conseguiu conectar ao Supabase. Verifique a internet e tente novamente.');\n  }\n\n  const body = await readJson(res);`,
    `  const {res,body} = await boundedFetchV4831(\`\u0024{url}\u0024{path}\`,{...options,headers});`, 'Supabase API timeout');
  s=swap(s,
    `  } catch {\n    signOutLocal();\n    return false;\n  }\n}\n\nasync function authedServerFetch`, 
    `  } catch (err) {\n    if(verifiedAuthDenialV4831(err))signOutLocal();\n    // A temporary outage keeps credentials so the next attempt can refresh safely.\n    return false;\n  }\n}\n\nasync function authedServerFetch`, 'refresh session policy');
  s=swap(s,
    "if (!session?.access_token || !session?.game_session_id) throw new Error('Sessão antiga; faça login novamente.');",
    "if (!session?.access_token || !session?.game_session_id){const e=new Error('Sessão antiga; faça login novamente.');e.code='SESSION_REQUIRED';throw e;}", 'malformed session must not be retained');
  s=swap(s,
    `  } catch {\n    signOutLocal();\n    return null;\n  }\n}\n\nexport async function checkGameSession`, 
    `  } catch (err) {\n    // Do not destroy sessionStorage on a 500, timeout or loss of signal.\n    if(verifiedAuthDenialV4831(err))signOutLocal();\n    return null;\n  }\n}\n\nexport async function checkGameSession`, 'restore session policy');
  return s;
});

patch('public/modules/stellar-autopilot-v48.js',s=>{
  s=swap(s,
    `  async function request(url,options={}){const res=await fetch(url,{...options,headers:authHeaders(),cache:'no-store'});const data=await res.json().catch(()=>({}));if(!res.ok)throw Error(data.error||\`Erro \u0024{res.status}\`);return data;}`,
    `  // ${TAG}: all grant lookups terminate, including a stalled response body.
  async function request(url,options={}){
    const controller=new AbortController();let expired=false;
    const timer=setTimeout(()=>{expired=true;controller.abort();},15000);
    try{const res=await fetch(url,{...options,headers:authHeaders(),signal:controller.signal,cache:'no-store'});
      const data=await res.json().catch(()=>({}));
      if(!res.ok){const e=Error(data.error||\`Erro \u0024{res.status}\`);e.status=res.status;e.code=data.code||null;throw e;}
      return data;
    }catch(e){if(expired){const timeout=Error('Tempo limite na consulta ao Autopilot');timeout.code='NETWORK_TIMEOUT';throw timeout;}throw e;}
    finally{clearTimeout(timer);}
  }`, 'bot API bounded fetch');
  s=swap(s,
    `        // Rede instável após salto: nenhuma ação enquanto o acesso não for revalidado.\n        // O bot preserva a rota por tempo limitado e retoma só após confirmação oficial.\n        if(running&&authorizedId===identity&&lastAccessAt>0&&now()-lastAccessAt<150000){\n          allowed=false;notify('Aguardando autorização online • rota preservada');\n          if(fab)fab.hidden=false;\n          return false;\n        }`,
    `        // ${TAG}: connection loss pauses the bot, not an explicit revocation.\n        if(running&&authorizedId===identity&&identity&&!([401,403].includes(Number(e?.status)))){\n          allowed=false;notify('Rede instável • aguardando verificação; rota preservada');\n          if(fab)fab.hidden=false;checkpoint(true);return false;\n        }`, 'do not stop bot on transient access failure');
  s=swap(s,
    `      if(authorizedId===String(getIdentity()||'')&&lastAccessAt>0&&ts-lastAccessAt<150000){\n        if(!refreshingAccess&&ts>=nextAccessAt)void refreshAccess();\n        notify('Autorização pendente • retomada automática');return;\n      }`,
    `      if(authorizedId&&authorizedId===String(getIdentity()||'')){\n        if(!refreshingAccess&&ts>=nextAccessAt)void refreshAccess();\n        notify('Reconectando com segurança • sem ações de economia');return;\n      }`, 'long outage pause');
  s=swap(s,
    `      if(lastHealthyAt && ts-lastHealthyAt<60000){notify('Reconectando ao setor • rota preservada');return;}\n      stop('Sessão offline por mais de 60s');return;`,
    `      // No network = no combat and no sales. Resume only with a fresh online snapshot.\n      if(String(getIdentity()||'')===authorizedId){notify('Sem sincronização do setor • aguardando servidor');return;}\n      stop('Sessão de jogo encerrada');return;`, 'offline grace');
  // Never repeat an ambiguous write: its acknowledgement may have been lost after the server committed it.
  s=swap(s,
    "else{failures++;buyFailuresInRow++;notify('Compra não confirmada pelo servidor');}",
    "else{failures++;buyFailuresInRow++;stop('Compra sem confirmação • confira estoque e saldo antes de reiniciar');}", 'ambiguous purchase guard');
  s=swap(s,
    "catch(e){failures++;buyFailuresInRow++;notify('Compra recusada: '+String(e?.message||e).slice(0,100));}",
    "catch(e){failures++;buyFailuresInRow++;stop('Compra com resposta perdida • confira estoque e saldo antes de reiniciar');}", 'purchase exception guard');
  s=swap(s,
    "if(ok===false){failures++;notify('Venda não confirmada pela loja');}",
    "if(ok===false){failures++;stop('Venda sem confirmação • confira o porão antes de reiniciar');}", 'ambiguous sale guard');
  s=swap(s,
    "}).catch(e=>{failures++;notify('Falha na venda: '+String(e?.message||e).slice(0,100));})",
    "}).catch(e=>{failures++;stop('Venda com resposta perdida • confira o porão antes de reiniciar');})", 'sale exception guard');
  s=swap(s,`ts-saved.storedAt>180000`, `ts-saved.storedAt>600000`, 'checkpoint recovery window');
  return s;
});

patch('public/game.js',s=>{
  s=swap(s,
    `setInterval(()=>{\n  if(!authenticated)return;\n  checkGameSession().catch(()=>{});\n},3000);`,
    `// ${TAG}: do not flood the database every 3 seconds; never overlap checks.\nlet sessionCheckInFlightV4831=false;\nasync function safeSessionCheckV4831(){\n  if(!authenticated||sessionCheckInFlightV4831||document.visibilityState==='hidden')return;\n  sessionCheckInFlightV4831=true;\n  try{await checkGameSession();if(sharedUniverseMap()&&!sharedUniverse.isOnline())sharedUniverse.recover();}catch(err){\n    if(err?.code!=='NETWORK_TIMEOUT'&&err?.code!=='NETWORK_OFFLINE')console.warn('[session-check]',err?.message||err);\n  }finally{sessionCheckInFlightV4831=false;}\n}\nsetInterval(()=>{void safeSessionCheckV4831();},20000);`, 'avoid session polling storms');
  s=swap(s,
    `else if(document.visibilityState==='visible'&&authenticated){checkGameSession().catch(()=>{});preloadActiveGameplayAssets();}`, 
    `else if(document.visibilityState==='visible'&&authenticated){sharedUniverse.recover();void safeSessionCheckV4831();preloadActiveGameplayAssets();}`, 'resume after background');
  return s;
});

// Write only after every anchor across ALL files has passed validation.
for(const {p,after} of edits){const target=path.join(root,p);fs.writeFileSync(target,after,'utf8');console.log('✅ V48.3.1 patched: '+p);}
console.log('✅ V48.3.1 network recovery complete. No SQL changes.');
