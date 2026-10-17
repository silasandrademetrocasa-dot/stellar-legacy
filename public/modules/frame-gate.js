// V20.2.10 — limitador tolerante a jitter do rAF, isolado e testável.
// Não modifica delta time, simulação, salvamentos ou dados online.
export function createFrameGate({toleranceMs=1.5}={}){
  const tolerance=Math.max(0,Math.min(2,Number(toleranceMs)||0));
  let last=null;
  return {
    reset(at=null){last=Number.isFinite(at)?at:null;},
    accept(at,targetFps=60){
      if(!Number.isFinite(at))return false;
      const fps=Math.max(1,Math.min(120,Number(targetFps)||60));
      const targetMs=1000/fps;
      if(last===null){last=at;return true;}
      const elapsed=at-last;
      if(elapsed<0||elapsed>1500){last=at;return true;}
      // rAF a ~16,0ms: dois callbacks sao ~32ms; sem tolerancia
      // o corte rigido de 33,3ms descarta mais um ciclo inteiro.
      if(elapsed+Math.min(tolerance,targetMs*.10)<targetMs)return false;
      last=at;
      return true;
    },
  };
}
