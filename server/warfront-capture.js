// Servidor: temporização da captura e classificação segura de falhas.
// Nunca permite confirmar domínio sem resposta do banco de dados.
export const CAPTURE_CONFIRMATION_TIMEOUT_MS=12000;
export const CAPTURE_FAILURE_BACKOFF_MS=10000;
export function captureElapsedSeconds(previousAt,now,capSeconds=2.5){
  const old=Number(previousAt)||Number(now)||0;
  if(!Number.isFinite(now)||!Number.isFinite(old))return 0;
  return Math.max(0,Math.min(capSeconds,(now-old)/1000));
}
export function classifyWarfrontCaptureError(error){
  const detail=String(error?.message||error||'');
  if(/WARFRONT_REVISION_CONFLICT/i.test(detail))return {code:'CONCORRENCIA',message:'O ponto mudou em outra sala. Atualizando o domínio salvo.'};
  if(/timeout|timed.out|ETIMEDOUT|ECONN|AbortError|fetch failed|CAPTURE_TIMEOUT/i.test(detail))return {code:'TEMPO_ESGOTADO',message:'A confirmação demorou demais. Conferindo o banco antes de tentar novamente.'};
  if(/JWT|apikey|service_role|permission|row.level security|42501|401|403|PGRST301/i.test(detail))return {code:'PERMISSAO_BANCO',message:'O servidor não conseguiu autorizar a gravação no Supabase. Verifique os logs do Render.'};
  return {code:'GRAVACAO_RECUSADA',message:'O banco não confirmou a conquista. Verifique os logs do Render.'};
}
export function withCaptureTimeout(promise,ms=CAPTURE_CONFIRMATION_TIMEOUT_MS){
  let timer;
  const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('CAPTURE_TIMEOUT')),ms);});
  return Promise.race([Promise.resolve(promise),timeout]).finally(()=>clearTimeout(timer));
}
