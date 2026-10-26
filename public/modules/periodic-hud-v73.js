// V73: tempo e prioridade isolados da lógica do jogo.
// Apenas elementos secundários entram na fila; compras e eventos continuam chamando updateUI() diretamente.
export function createPeriodicHudBudgetV73({intervalMs=1250,now=()=>performance.now()}={}){
  let last=-Infinity,accepted=0,skipped=0;
  return {
    shouldSchedule(time=now()){
      if(!Number.isFinite(time)||time-last<intervalMs){skipped++;return false;}
      last=time;accepted++;return true;
    },
    snapshot:()=>({accepted,skipped,intervalMs}),
    reset:()=>{last=-Infinity;accepted=0;skipped=0;}
  };
}
