// V47.7.6 — non-blocking in-game confirmation matching the existing Hangar buy/sell card.
// No alert()/confirm()/prompt(); modal does not reload, pause, or replace the session.
let queue=Promise.resolve();
function createDialog(message,{title='Confirmar ação?',danger=false,prompt=false,notice=false,initial=''}={}){
  return new Promise(resolve=>{
    const overlay=document.createElement('div');overlay.className='modal fixed-modal stellar-v4776-dialog';
    overlay.style.zIndex='9998';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');
    const card=document.createElement('div');card.className='modal-card sale-confirm-card';card.style.maxWidth='min(480px,calc(100vw - 22px))';
    const icon=document.createElement('div');icon.className='sale-confirm-icon';icon.textContent=danger?'⚠':'✦';
    const eyebrow=document.createElement('div');eyebrow.className='eyebrow';eyebrow.textContent=notice?'AVISO DO UNIVERSO':'CONFIRMAÇÃO DE AÇÃO';
    const h=document.createElement('h2');h.textContent=title;
    const desc=document.createElement('div');desc.className='sale-confirm-item';desc.textContent=String(message||'Confirma esta operação?');
    desc.style.whiteSpace='pre-line';desc.style.overflowWrap='anywhere';
    card.append(icon,eyebrow,h,desc);
    let field=null;
    if(prompt){field=document.createElement('input');field.type='text';field.autocomplete='off';field.spellcheck=false;field.value=String(initial||'');field.maxLength=220;field.placeholder='Digite sua confirmação';field.setAttribute('aria-label','Resposta');field.style.cssText='display:block;width:100%;margin:14px 0;padding:12px;color:#e6f7ff;background:#051526;border:1px solid #35769c;border-radius:9px;font-size:16px;box-sizing:border-box';card.append(field);}
    const actions=document.createElement('div');actions.className='sale-confirm-actions';
    const cancel=document.createElement('button');cancel.className='ghost-btn';cancel.type='button';cancel.textContent='CANCELAR';
    const okay=document.createElement('button');okay.className=danger?'danger-btn':'primary-btn';okay.type='button';okay.textContent=notice?'ENTENDI':'CONFIRMAR';
    if(!notice)actions.append(cancel);actions.append(okay);card.append(actions);overlay.append(card);
    let finished=false;const priorFocus=document.activeElement;
    const done=value=>{if(finished)return;finished=true;document.removeEventListener('keydown',keyHandler,true);overlay.remove();try{priorFocus?.focus?.({preventScroll:true})}catch{}resolve(value)};
    const keyHandler=e=>{if(e.key==='Escape'){e.preventDefault();done(prompt?null:false)}else if(e.key==='Enter'&&(e.target===field||!field)){e.preventDefault();done(prompt?field.value:true)}};
    document.addEventListener('keydown',keyHandler,true);
    overlay.addEventListener('click',e=>{if(e.target===overlay)done(prompt?null:false)});
    cancel.onclick=()=>done(prompt?null:false);okay.onclick=()=>done(prompt?field.value:true);
    document.body.append(overlay);(field||okay).focus({preventScroll:true});
  });
}
function enqueue(message,options){const p=queue.catch(()=>{}).then(()=>createDialog(message,options));queue=p.then(()=>{},()=>{});return p;}
export const stellarConfirmV4776=(message,options={})=>enqueue(message,options);
export const stellarPromptV4776=(message,initial='')=>enqueue(message,{title:'Confirmação administrativa',prompt:true,danger:true,initial});
export const stellarNoticeV4776=(message,options={})=>enqueue(message,{...options,title:options.title||'Mensagem do Universo',notice:true});
