// V70: todas as prévias compartilham um único requestAnimationFrame.
// O Canvas do jogo NÃO usa esta fila; lógica e combate não são modificados.
export function createPreviewScheduler({requestFrame, visible=(canvas)=>{
  if(!canvas?.isConnected||!canvas.getBoundingClientRect)return false;
  const b=canvas.getBoundingClientRect();
  return b.width>0&&b.height>0&&b.bottom>=0&&b.right>=0&&b.top<innerHeight&&b.left<innerWidth;
}, fps=10, warn=()=>{}}={}){
  if(typeof requestFrame!=='function')throw new TypeError('requestFrame requerido');
  const jobs=new Map();let pending=false,last=-Infinity;
  const tick=now=>{
    pending=false;
    if(!jobs.size)return;
    if(now-last>=1000/fps){
      last=now;
      for(const [canvas,draw] of jobs){
        if(!canvas?.isConnected){jobs.delete(canvas);continue;}
        if(!visible(canvas))continue;
        try{draw(now);}catch(err){jobs.delete(canvas);warn('Preview desativada por falha',err);}
      }
    }
    if(jobs.size&&!pending){pending=true;requestFrame(tick);}
  };
  function register(canvas,draw){
    if(!canvas||typeof draw!=='function')return ()=>{};
    jobs.set(canvas,draw);
    if(!pending){pending=true;requestFrame(tick);}
    return ()=>jobs.delete(canvas);
  }
  return {register,count:()=>jobs.size,clear:()=>jobs.clear()};
}
