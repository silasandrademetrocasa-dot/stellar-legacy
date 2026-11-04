/**
 * Nucleo unico V119 - gateway opcional. O modo observe nao altera os saves.
 * SOMENTE o Render com service_role pode chamar o RPC SQL.
 * A verdadeira autoridade continua sendo game_saves; backups/logs sao derivados.
 */
import { randomUUID } from 'node:crypto';
import {savePromotionReadinessV1195} from './save-promotion-gate-v1195.js';

export const SAVE_MODULES_V119=Object.freeze(['checkpoint','hangar','missoes','economia','leilao','farm','combate','server']);
export const SAVE_LOG_MODULES_V119=Object.freeze(['hangar','missoes','economia','leilao','combate','progresso','criacao']);

export function saveCoreModeV119(value=process.env.STELLAR_SAVE_V119_MODE){
  return savePromotionReadinessV1195({requestedMode:value}).effectiveMode;
}
export function saveModuleForRequestV119(req){
  const path=String(req?.originalUrl||req?.path||'').toLowerCase();
  if(req?.body?.equipmentMutationV1062)return 'hangar';
  if(path.includes('/auction/'))return 'leilao';
  if(path.includes('/economy/')||path.includes('/purchase'))return 'economia';
  if(path.includes('/save'))return 'checkpoint';
  return 'server';
}
export function validOperationIdV119(input){
  const value=String(input||'');
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
export function saveCoreEnvelopeV119(req,state){
  if(!state||typeof state!=='object'||Array.isArray(state))throw Error('SAVE_STATE_INVALID');
  const rawId=req?.body?.operation_id;
  if(rawId!==undefined&&rawId!==null&&!validOperationIdV119(rawId))throw Error('SAVE_OPERATION_ID_INVALID');
  const expected=req?.body?.expected_revision;
  if(expected!==undefined&&expected!==null&&(!Number.isSafeInteger(Number(expected))||Number(expected)<0))
    throw Error('SAVE_EXPECTED_REVISION_INVALID');
  return {
    p_operation_id:rawId||randomUUID(),
    p_module:saveModuleForRequestV119(req),
    p_action:'save',
    p_expected_revision:expected==null?null:Number(expected)
  };
}
export async function commitSaveCoreV119({service,req,userId,state,callsign}){
  const envelope=saveCoreEnvelopeV119(req,state);
  const {data,error}=await service.rpc('stellar_commit_player_command_v119',{
    p_user_id:userId,p_state:state,p_callsign:callsign,...envelope
  });
  if(error)return {ok:false,error:{code:String(error.code||'SAVE_GATEWAY_DB_ERROR'),message:String(error.message||'Falha ao confirmar o jogador.') }};
  if(data?.ok!==true)return {ok:false,error:{code:String(data?.code||'SAVE_NOT_CONFIRMED'),message:String(data?.message||'O save nao foi confirmado no servidor.')},revision:data?.revision};
  return {ok:true,revision:data.revision,operationId:data.operation_id,replayed:data.replayed===true};
}
