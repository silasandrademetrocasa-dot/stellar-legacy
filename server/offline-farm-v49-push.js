/* STELLAR_V49_WEB_PUSH
 * Web Push is optional until VAPID keys and an external minute-level cron are configured.
 * The dispatch endpoint never loops in the background; pg_cron only wakes Render when a farm is due.
 */
import {createHash, timingSafeEqual} from 'node:crypto';
const sha=s=>createHash('sha256').update(String(s)).digest('hex');
const secretEqual=(a,b)=>{const x=Buffer.from(String(a||'')),y=Buffer.from(String(b||''));return x.length>0&&x.length===y.length&&timingSafeEqual(x,y)};
const activeConfig=()=>!!(process.env.STELLAR_FARM_VAPID_PUBLIC&&process.env.STELLAR_FARM_VAPID_PRIVATE&&process.env.STELLAR_FARM_VAPID_CONTACT);
let cachedWebPush=null;
async function sender(){
 if(!activeConfig())throw Error('Push não configurado no Render');
 if(!cachedWebPush){const mod=await import('web-push');cachedWebPush=mod.default||mod;cachedWebPush.setVapidDetails(process.env.STELLAR_FARM_VAPID_CONTACT,process.env.STELLAR_FARM_VAPID_PUBLIC,process.env.STELLAR_FARM_VAPID_PRIVATE);}
 return cachedWebPush;
}
function validSub(s){
 if(!s||typeof s!=='object')return false;
 const endpoint=String(s.endpoint||'');
 if(endpoint.length<30||endpoint.length>3000||!endpoint.startsWith('https://'))return false;
 try{const u=new URL(endpoint);const host=u.hostname.toLowerCase();const allowed=['fcm.googleapis.com','updates.push.services.mozilla.com','push.services.mozilla.com','web.push.apple.com'].includes(host)||host.endsWith('.push.apple.com');if(!allowed||u.username||u.password||(u.port&&u.port!=='443'))return false;}catch{return false;}
 return [s.keys?.p256dh,s.keys?.auth].every(x=>typeof x==='string'&&x.length>=12&&x.length<300&&/^[\w-]+$/.test(x));
}
export function installFarmPushV49(app,{requireUser,asyncRoute,requireEliteAdmin}){
 const err=(res,e)=>res.status(503).json({ok:false,error:String(e?.message||e).slice(0,180)});
 app.get('/api/offline-farm/v484/v49/push-config',requireUser,asyncRoute(async(req,res)=>{
  res.set('Cache-Control','no-store');res.json({configured:activeConfig(),publicKey:activeConfig()?process.env.STELLAR_FARM_VAPID_PUBLIC:null,supportsBackground:true});
 }));
 app.post('/api/offline-farm/v484/v49/push-subscribe',requireUser,asyncRoute(async(req,res)=>{
  res.set('Cache-Control','no-store');if(!activeConfig())return res.status(409).json({error:'Notificações externas ainda não configuradas'});
  const sub=req.body?.subscription;if(!validSub(sub))return res.status(400).json({error:'Assinatura Web Push inválida'});
  try{
   const sb=await requireEliteAdmin(),now=new Date().toISOString();
   const row={user_id:req.user.id,endpoint_hash:sha(sub.endpoint),endpoint:sub.endpoint,p256dh:sub.keys.p256dh,auth:sub.keys.auth,enabled:true,updated_at:now};
   const {error:stale}=await sb.from('stellar_farm_push_subscriptions_v489').delete().eq('endpoint_hash',row.endpoint_hash).neq('user_id',req.user.id);
   if(stale)throw stale;
   const {error}=await sb.from('stellar_farm_push_subscriptions_v489').upsert(row,{onConflict:'user_id,endpoint_hash'});
   if(error)throw error;
   res.json({ok:true,subscribed:true});
  }catch(e){err(res,e);}
 }));
 app.post('/api/offline-farm/v484/v49/push-unsubscribe',requireUser,asyncRoute(async(req,res)=>{
  const endpoint=String(req.body?.endpoint||'');if(endpoint.length>3000||!endpoint.startsWith('https://'))return res.status(400).json({error:'Endpoint inválido'});
  try{const sb=await requireEliteAdmin();const {error}=await sb.from('stellar_farm_push_subscriptions_v489').delete().eq('user_id',req.user.id).eq('endpoint_hash',sha(endpoint));if(error)throw error;res.json({ok:true});}
  catch(e){err(res,e);}
 }));
 // Only a server-owned dispatch token can trigger real notifications, never a user JWT.
 app.post('/api/offline-farm/v49/dispatch',asyncRoute(async(req,res)=>{
  const expected=process.env.STELLAR_FARM_PUSH_DISPATCH_TOKEN;
  if(!expected||expected.length<32||!secretEqual(req.get('x-stellar-farm-push-token'),expected))return res.status(403).json({error:'Forbidden'});
  if(!activeConfig())return res.status(503).json({error:'Web Push VAPID ausente'});
  try{
   const sb=await requireEliteAdmin(),push=await sender();
   const cutoff=new Date(Date.now()-12*3600_000).toISOString();
   const {data:farms,error}=await sb.from('stellar_offline_farm_v484').select('id,user_id,map_id,npc_key,ends_at,status').eq('status','running').lte('ends_at',new Date().toISOString()).gte('ends_at',cutoff).order('ends_at',{ascending:true}).limit(80);
   if(error)throw error;
   let sent=0,expired=0,failed=0;
   for(const farm of farms||[]){
    const {data:subs,error:se}=await sb.from('stellar_farm_push_subscriptions_v489').select('id,endpoint,p256dh,auth,last_notified_session_id').eq('user_id',farm.user_id).eq('enabled',true).limit(8);
    if(se){failed++;continue;}
    for(const sub of subs||[]){
     if(sub.last_notified_session_id===farm.id)continue;
     // Before dispatch, recheck the row; a resgate may have completed meanwhile.
     const {data:current}=await sb.from('stellar_offline_farm_v484').select('status').eq('id',farm.id).maybeSingle();
     if(current?.status!=='running')continue;
     try{
      const text=JSON.stringify({title:'Stellar Legacy • Farm concluído',body:'Sua sessão terminou. Abra o Farm Offline e resgate as recompensas.',url:'/',sessionId:farm.id});
      await push.sendNotification({endpoint:sub.endpoint,keys:{p256dh:sub.p256dh,auth:sub.auth}},text,{TTL:3600,urgency:'normal'});
      const {error:up}=await sb.from('stellar_farm_push_subscriptions_v489').update({last_notified_session_id:farm.id,last_notified_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',sub.id);
      if(up)throw up;
      sent++;
     }catch(e){
      if([404,410].includes(Number(e.statusCode))){await sb.from('stellar_farm_push_subscriptions_v489').delete().eq('id',sub.id);expired++;}
      else failed++;
     }
    }
   }
   res.set('Cache-Control','no-store').json({ok:true,checked:(farms||[]).length,sent,expired,failed});
  }catch(e){err(res,e);}
 }));
}
