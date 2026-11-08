// Stable V134 transaction entry. Old filename kept until installer removes unused files safely.
import {operationDigestV125} from './economy-receipts-v125.js';
export function commitEconomyUnifiedV1332(db,args){
 return db.rpc('stellar_player_commit',{p_user_id:args.p_user_id,p_command_id:args.p_request_id,p_module:'economy',p_request_hash:args.p_request_hash,p_payload:{operation:args.p_operation,base:args.p_base_state,state:args.p_state,receipt:args.p_receipt}});
}
export function settleAuctionUnifiedV1332(db,args){
 const payload={hour_key:args.p_hour_key,lot_ref:args.p_lot_ref},hash=operationDigestV125('auction:settle',payload);
 return db.rpc('stellar_player_commit',{p_user_id:args.p_user_id,p_command_id:'auction_'+hash,p_module:'auction',p_request_hash:hash,p_payload:payload});
}
