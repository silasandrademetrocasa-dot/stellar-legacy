#!/usr/bin/env node
// Applied by the Universal ZIP Installer during npm run check (idempotent).
// Patches only client labels, reset epoch reconciliation and API reset guard.
// Never calls the database or changes player balances/saves.
import {readFileSync,writeFileSync} from 'node:fs';
const root=new URL('../',import.meta.url);
const read=p=>readFileSync(new URL(p,root),'utf8');
const put=(p,fn)=>{const original=read(p),next=fn(original);if(next!==original){writeFileSync(new URL(p,root),next);console.log('PRELAUNCH • atualizado:',p);}else console.log('PRELAUNCH • OK:',p);};
function once(s,before,after,tag){
  if(s.includes(after))return s;
  const occurrences=s.split(before).length-1;
  if(occurrences!==1)throw new Error(`PRELAUNCH ${tag}: esperado 1 trecho, localizado ${occurrences}`);
  return s.replace(before,after);
}
put('public/index.html',s=>{
  s=once(s,'<b>ALTA</b><span>60 FPS • entidades','<b>ALTA</b><span>FPS livre (rAF) • entidades','rótulo alta');
  s=once(s,'<b>MÉDIA</b><span>45 FPS • entidades','<b>MÉDIA</b><span>FPS livre (rAF) • entidades','rótulo média');
  return once(s,'<b>BAIXA</b><span>FPS livre (até 120) • entidades','<b>BAIXA</b><span>FPS livre (rAF) • entidades','rótulo baixa');
});
put('public/api.js',s=>once(s,
  'return { state: body?.state || null, updated_at: body?.updated_at || null };',
  'return { state: body?.state || null, updated_at: body?.updated_at || null, reset_epoch:Number(body?.reset_epoch)||0 };',
  'expose save reset epoch'));
put('public/game.js',s=>{
  s=once(s,'const TWO_PI = Math.PI * 2;','let accountResetEpochV478=0; // Servidor autoritativo: nenhuma gravacao com epoch antigo.\nconst TWO_PI = Math.PI * 2;','reset epoch state');
  s=once(s,'  progress.clientSavedAt=Date.now();\n  localStorage.setItem(saveKey(),JSON.stringify(progress));',
    '  progress.clientSavedAt=Date.now();\n  progress.adminResetEpoch=accountResetEpochV478;\n  localStorage.setItem(saveKey(),JSON.stringify(progress));','local save epoch');
  s=once(s,'  try{const result=await saveCloudSave(progress);',
    '  try{progress.adminResetEpoch=accountResetEpochV478;const result=await saveCloudSave(progress);','cloud save epoch');
  s=once(s,
    '    const remote=await loadCloudSave();\n    if(remote?.state?.accountOwnerId',
    `    const remote=await loadCloudSave();
    accountResetEpochV478=Math.max(0,Math.trunc(Number(remote?.reset_epoch)||0));
    // Never re-upload an old device save after an ADM reset. A newer local timestamp is irrelevant.
    if(local && Math.max(0,Math.trunc(Number(local.adminResetEpoch)||0))!==accountResetEpochV478){
      try{localStorage.removeItem(saveKey());}catch{}
      local=null;
      console.info('[admin-reset] save local antigo descartado; novo personagem necessário.');
    }
    if(remote?.state?.accountOwnerId`,
    'bootstrap reset reconciliation');
  s=once(s,
    "if(e?.code==='SAVE_OWNER_MISMATCH'){setSync('BLOQUEADO','err');",
    "if(e?.code==='SAVE_RESET_STALE'){try{localStorage.removeItem(saveKey());}catch{}forceLogoutBecauseSessionMoved('Conta zerada pelo ADM. Faça login novamente para criar seu piloto.');return;}\n    if(e?.code==='SAVE_OWNER_MISMATCH'){setSync('BLOQUEADO','err');",
    'reject stale reset save');
  s=once(s,'await adminResetAccount(user.user_id);changed=true;adminSetMessage',
    "const resetResult=await adminResetAccount(user.user_id);if(resetResult?.verified!==true||!Number.isSafeInteger(Number(resetResult.reset_epoch)))throw new Error('O banco não confirmou o reset completo.');changed=true;adminSetMessage",'ADM reset confirmation');
  return once(s,'await adminDeleteAccount(user.user_id);changed=true;adminSetMessage',
    "const deleteResult=await adminDeleteAccount(user.user_id);if(deleteResult?.verified!==true)throw new Error('O banco não confirmou a exclusão definitiva.');changed=true;adminSetMessage",'ADM delete confirmation');
});
put('server/index.js',s=>{
  s=once(s,
    "  const { data, error } = await req.sb.from('game_saves').select('state,updated_at').eq('user_id', req.user.id).maybeSingle();\n  if (error) return res.status(400).json({ error: error.message });\n  res.json({ state: data?.state || null, updated_at: data?.updated_at || null });",
    `  const { data, error } = await req.sb.from('game_saves').select('state,updated_at').eq('user_id', req.user.id).maybeSingle();
  if (error) return res.status(400).json({ error: error.message });
  const {data: resetRecord,error: resetErr}=await req.sb.from('stellar_account_reset_epochs_v478').select('epoch').eq('user_id',req.user.id).maybeSingle();
  if(resetErr)return res.status(503).json({error:'Integridade do reset indisponível. Execute o SQL de pré-lançamento.'});
  res.set('Cache-Control','no-store');
  res.json({ state: data?.state || null, updated_at: data?.updated_at || null,reset_epoch:Number(resetRecord?.epoch)||0 });`,
    'GET save authoritative epoch');
  s=once(s,
    "  if (!state || typeof state !== 'object') return res.status(400).json({ error: 'Save inválido.' });",
    `  if (!state || typeof state !== 'object') return res.status(400).json({ error: 'Save inválido.' });
  const {data:resetRecord,error:resetErr}=await req.sb.from('stellar_account_reset_epochs_v478').select('epoch').eq('user_id',req.user.id).maybeSingle();
  if(resetErr)return res.status(503).json({error:'Integridade do reset indisponível. Execute o SQL de pré-lançamento.'});
  const expectedEpoch=Math.max(0,Math.trunc(Number(resetRecord?.epoch)||0));
  const incomingEpoch=Math.max(0,Math.trunc(Number(state.adminResetEpoch)||0));
  if(expectedEpoch!==incomingEpoch)return res.status(409).json({error:'SAVE_RESET_STALE: progresso antigo após reset administrativo.',code:'SAVE_RESET_STALE'});`,
    'PUT save epoch safety');
  return s;
});
console.log('PRELAUNCH • alterações completas (no-op na execução seguinte).');
