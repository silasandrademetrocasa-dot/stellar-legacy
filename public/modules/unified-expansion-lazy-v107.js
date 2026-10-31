// Universo Estelar V107: carregamento sob demanda, isolado do bootstrap do piloto.
// Nenhum import pesado nem chamada à API da expansão ocorre durante o login.
let loading=null;
let ready=false;
export async function openUniverseLazyV107({load=()=>import('./unified-expansion-v42.js?v=108.1.0'), onReady=()=>{}, onError=()=>{}}={}){
  if(ready){onReady();return true;}
  if(loading)return loading;
  loading=Promise.resolve().then(load).then(()=>{
    ready=true;
    onReady();
    return true;
  },error=>{
    onError(error);
    return false;
  }).finally(()=>{loading=null;});
  return loading;
}
function attachUniverseLauncherV107(){
  const btn=document.getElementById('frontierExpansionBtnV42');
  if(!btn||btn.dataset.stellarUniverseLazy==='1')return;
  btn.dataset.stellarUniverseLazy='1';
  btn.addEventListener('click',event=>{
    if(ready)return; // módulo original abrirá o modal
    event.preventDefault();
    // Somente carregamento explícito iniciado pelo clique. Não consulta saves no bootstrap.
    void openUniverseLazyV107({
      onReady:()=>{if(btn.isConnected)btn.click();},
      onError:()=>{
        const root=document.getElementById('frontierExpansionContentV42');
        const modal=document.getElementById('frontierExpansionModalV42');
        if(!root||!modal)return;
        root.textContent='Não foi possível abrir o Universo Estelar. Tente novamente.';
        modal.classList.remove('hidden');
      }
    });
  });
}
if(typeof document!=='undefined'){
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',attachUniverseLauncherV107,{once:true});
 else attachUniverseLauncherV107();
}
