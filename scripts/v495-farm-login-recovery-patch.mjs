/* STELLAR V49.5: claim/cancel restores official save without reloading the page or signing out. */
import fs from 'node:fs';
const path='public/game.js',tag='STELLAR_FARM_RECOVER_SESSION_V495';
let code=fs.readFileSync(path,'utf8');
if(code.includes(tag)){console.log('✅ V49.5: recuperação da sessão já instalada');process.exit(0);}
const needle="onFinish:async()=>{location.reload();}";
if(code.split(needle).length!==2)throw Error('V49.5: anchor de onFinish não encontrado exatamente uma vez');
const callback=`onFinish:async()=>{
    /* ${tag} - nunca sair da conta por resgatar/cancelar. */
    try{
      const currentAccount=String(getUser()?.id||'');
      if(!authenticated||!currentAccount)throw Error('Sessão do piloto ausente');
      const serverSave=await loadCloudSave();
      if(!serverSave?.state)throw Error('Save no servidor ainda indisponível');
      /* O snapshot antigo do PWA não pode sobrescrever o resgate SQL. */
      cloudDirty=false;
      try{localStorage.setItem(saveKey(),JSON.stringify({...serverSave.state,clientSavedAt:0}));}catch{}
      await afterAuth();
      if(!authenticated||String(getUser()?.id||'')!==currentAccount)throw Error('Falha ao retomar sessão');
      showToast('🌙 Farm finalizado • recompensas sincronizadas, piloto conectado','system');
    }catch(err){
      console.warn('[farm-v495] sincronização pós-farm',err);
      showToast('Farm finalizado. Sincronização pendente: tente ATUALIZAR no menu.','system');
    }
  }`;
code=code.replace(needle,callback);
fs.writeFileSync(path,code);
console.log('✅ V49.5: resgate/cancelamento sem location.reload e sem logout');
