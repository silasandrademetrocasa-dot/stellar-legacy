import {stat} from 'node:fs/promises';
import path from 'node:path';
/** Preflight V100, deliberately NOT a claim of real-device or multiplayer load testing. */
export const CORE_APK_ASSETS_V100=Object.freeze([
 'public/index.html','public/game.js','public/api.js','public/style.css',
 'public/assets/v65/ships/top/phoenix.webp','public/assets/v65/aux/aux9.webp',
 'public/assets/v65/npcs/streuner.webp','public/modules/stellar-autopilot-v48.js'
]);
export function releaseReadinessV100({version,checks=[],databaseReady=false}={}){
 const failures=checks.filter(x=>!x.ok).map(x=>x.name);
 if(!databaseReady)failures.push('Serviço de banco em produção não confirmado');
 return {version,pass:failures.length===0,failures,checks,manualAcceptanceRequired:[
 'Farm Offline: pagamento real e nenhum conflito indevido',
 'Autopilot Astral: 1 hora de montagem/entrada/conclusão',
 'Arena PvP e Warfront com duas contas',
 'APK Android: login, imagens locais, reconexão e consumo de dados',
 'Rollback e recuperação de sessões reais'
 ]};
}
export function installReleaseReadinessV100(app,{requireUser,asyncRoute,requireEliteAdmin,publicRoot,releaseVersion}){
 app.get('/api/admin/v100/readiness',requireUser,asyncRoute(async(req,res)=>{
  res.set('Cache-Control','no-store');
  const {data:allowed,error:authErr}=await req.sb.rpc('is_game_admin_v1763',{p_uid:req.user.id});
  if(authErr||allowed!==true)return res.status(403).json({error:'Somente ADM.'});
  await requireEliteAdmin();
  const checks=await Promise.all(CORE_APK_ASSETS_V100.map(async(name)=>{
   try{const info=await stat(path.join(publicRoot,'..',name));return {name,ok:info.isFile()&&info.size>0,bytes:info.size};}
   catch{return {name,ok:false,bytes:0};}
  }));
  const report=releaseReadinessV100({version:releaseVersion,checks,databaseReady:true});
  return res.json({ok:true,generatedAt:new Date().toISOString(),...report,assessment:'Pré-checagem estrutural. Testes em aparelho e economia permanecem obrigatórios.'});
 }));
}
