import {createHmac,timingSafeEqual} from 'node:crypto';
export function createCollectionProofV146(secret,{now=Date.now,maxAgeMs=86400000}={}){
 const sign=payload=>createHmac('sha256',secret).update(payload).digest('base64url');
 return {
  issue(owner,session,body,arrival){
   const p=arrival?.player,r=arrival?.room;if(!p||!r?.key)throw Error('COLLECTION_MAP_MISMATCH');
   const data={owner,session,drop:body.drop_id,collector:body.collector||'ship',at:now(),room:{key:r.key,mapId:r.mapId,map:{battle:!!r.map?.battle,world:r.map?.world}},player:{x:p.x,y:p.y,updatedAt:p.updatedAt,pet:p.pet?{owned:p.pet.owned,activeGear:p.pet.activeGear,x:p.pet.x,y:p.pet.y}:null}};
   const payload=Buffer.from(JSON.stringify(data)).toString('base64url');return payload+'.'+sign(payload);
  },
  verify(owner,body){
   const token=String(body.proof||''),parts=token.split('.');if(parts.length!==2||token.length>10000)throw Object.assign(Error('Coleta sem comprovante de posição.'),{code:'COLLECTION_PROOF_REQUIRED',status:409});
   const expected=Buffer.from(sign(parts[0])),signature=Buffer.from(parts[1]);
   if(signature.length!==expected.length||!timingSafeEqual(signature,expected))throw Object.assign(Error('Comprovante inválido.'),{code:'COLLECTION_PROOF_INVALID',status:409});
   const data=JSON.parse(Buffer.from(parts[0],'base64url').toString());
   if(data.owner!==owner||data.drop!==body.drop_id||data.collector!==(body.collector||'ship')||data.at>now()+1000||now()-data.at>maxAgeMs)throw Object.assign(Error('Comprovante expirado ou divergente.'),{code:'COLLECTION_PROOF_INVALID',status:409});
   // Preserve the server's original observation age for AUX validation, independent of batch latency.
   data.player.updatedAt=now()-Math.max(0,data.at-Number(data.player.updatedAt||0));
   return {room:data.room,player:data.player};
  }
 };
}
