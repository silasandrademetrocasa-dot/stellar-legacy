// Revisions are authorities, balances are not monotonic (spending is legitimate).
export const SAVE_AUTHORITIES_V1331=['serverPurchaseRevision','serverNpcRewardRevision','serverOreRevision','serverEliteRevision'];
export function staleSaveAuthoritiesV1331(current,incoming){
 if(!current||!incoming||!current.accountOwnerId||current.accountOwnerId!==incoming.accountOwnerId)return [];
 if(Number(incoming.adminResetEpoch||0)>Number(current.adminResetEpoch||0))return [];
 return SAVE_AUTHORITIES_V1331.filter(k=>Number(current[k]||0)>Number(incoming[k]||0));
}
