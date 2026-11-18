/* Local visual preference only. Runs before CSS; never reads/writes player saves. */
(()=>{
 'use strict';
 const key='stellar_interface_appearance_v1464',root=document.documentElement;
 const normalize=value=>value==='system'?'system':'game';
 let mode='game';
 try{mode=normalize(localStorage.getItem(key));}catch{}
 function render(){
  root.setAttribute('data-interface-appearance',mode);
  const select=document.getElementById('interfaceAppearanceV1464');
  if(select)select.value=mode;
  const status=document.getElementById('interfaceAppearanceStatusV1464');
  if(status)status.textContent=mode==='game'?'Cores originais de Stellar Legacy.':'A interface acompanha as cores e o contraste do sistema.';
 }
 function choose(value){mode=normalize(value);try{localStorage.setItem(key,mode);}catch{}render();}
 function bind(){
  const select=document.getElementById('interfaceAppearanceV1464');
  if(select)select.addEventListener('change',()=>choose(select.value));
  render();
 }
 render();
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();
