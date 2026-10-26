// V70: orçamento de pixel do Canvas 2D separado de coordenadas e regras do jogo.
// O adaptador jamais altera o perfil escolhido: reduz somente a escala interna do bitmap.
const LIMITS = Object.freeze({
  low:    {min: .78, max: 1, initial: 1, target: 45},
  medium: {min: .70, max: 1, initial: .90, target: 35},
  high:   {min: .70, max: 1, initial: .85, target: 30},
});
const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));
const quantile = (values,p)=>{
  if (!values.length) return 0;
  const sorted=[...values].sort((a,b)=>a-b);
  return sorted[Math.min(sorted.length-1,Math.ceil(sorted.length*p)-1)];
};
export function createAdaptiveResolution({mobile=false,cooldownMs=4500,windowMs=2800}={}) {
  let mode='low',scale=1,lastSwitch=-Infinity,windowStart=null,slowWindows=0,fastWindows=0;
  const work=[],intervals=[];
  function setMode(next){
    if(!LIMITS[next])next='low';
    if(mode!==next){mode=next;scale=mobile?LIMITS[mode].initial:1;work.length=0;intervals.length=0;windowStart=null;slowWindows=0;fastWindows=0;lastSwitch=-Infinity;}
    return scale;
  }
  function observe(at,workMs,intervalMs){
    if(!mobile||!Number.isFinite(at)||!Number.isFinite(workMs)||!Number.isFinite(intervalMs)||intervalMs<0||intervalMs>200)return false;
    if(windowStart===null)windowStart=at;
    work.push(Math.min(200,Math.max(0,workMs)));
    intervals.push(Math.min(200,Math.max(0,intervalMs)));
    if(at-windowStart<windowMs)return false;
    const w75=quantile(work,.75),f75=quantile(intervals,.75),budget=1000/LIMITS[mode].target;
    work.length=0;intervals.length=0;windowStart=at;
    // V74: rAF can stall because of tab compositing/throttling even when the
    // measured Canvas work is cheap. Shrinking the buffer on every such stall
    // causes an unnecessary canvas reset and visible black flashes.
    // Only measurable frame work is a reason to resize the canvas.
    const pressure=w75>budget*.90;
    const spare=w75<budget*.43&&f75<budget*.76;
    slowWindows=pressure?slowWindows+1:0;
    fastWindows=spare?fastWindows+1:0;
    if(at-lastSwitch<cooldownMs)return false;
    if(slowWindows>=1&&scale>LIMITS[mode].min){
      scale=clamp(Math.round((scale-.08)*100)/100,LIMITS[mode].min,LIMITS[mode].max);
      lastSwitch=at;slowWindows=0;fastWindows=0;return true;
    }
    if(fastWindows>=3&&scale<LIMITS[mode].max){
      scale=clamp(Math.round((scale+.05)*100)/100,LIMITS[mode].min,LIMITS[mode].max);
      lastSwitch=at;slowWindows=0;fastWindows=0;return true;
    }
    return false;
  }
  setMode(mobile?'medium':'low');
  return {setMode,observe,scale:()=>scale,mode:()=>mode,limits:()=>LIMITS[mode]};
}
export function effectiveCanvasDpr(deviceDpr,profileCap,scale=1){
  return Math.max(.65,Math.min(Number(deviceDpr)||1,Number(profileCap)||1)*clamp(Number(scale)||1,.65,1));
}
