// Stellar Legacy V20.2.2 — diagnóstico de desempenho local e voluntário.
// Coleta somente tempos de quadros (amostras limitadas). Não envia dados, não acessa contas/saves.
const SAMPLE_LIMIT=240;
const MAX_SAMPLE_GAP_MS=1500;
const finiteNonnegative=(value)=>Number.isFinite(value)&&value>=0;
function percentile(values,p){
  if(!values.length)return null;
  const sorted=[...values].sort((a,b)=>a-b);
  return sorted[Math.min(sorted.length-1,Math.ceil(p*sorted.length)-1)];
}
export function createPerformanceMonitor({capacity=SAMPLE_LIMIT}={}) {
  const limit=Math.max(10,Math.min(SAMPLE_LIMIT,Math.floor(Number(capacity)||SAMPLE_LIMIT)));
  let enabled=false,prevAt=null;
  const frames=[];
  let framesSeen=0,stutters=0;
  function clear(){frames.length=0;framesSeen=0;stutters=0;prevAt=null;}
  function setEnabled(value){
    const next=Boolean(value);
    if(enabled!==next){enabled=next;clear();}
  }
  function pause(){prevAt=null;}
  function record(at,workMs,targetFps=60){
    if(!enabled||!finiteNonnegative(at)||!finiteNonnegative(workMs))return false;
    const time=Number(at),work=Number(workMs),target=Math.max(1,Math.min(240,Number(targetFps)||60));
    if(prevAt===null){prevAt=time;return false;}
    const interval=time-prevAt;
    prevAt=time;
    // Trocas de aba, bloqueios de tela e suspensão do SO não são travamentos do render.
    if(!Number.isFinite(interval)||interval<=0||interval>MAX_SAMPLE_GAP_MS)return false;
    const threshold=Math.max(80,2500/target);
    const stalled=interval>threshold;
    const frame={interval,work:Math.min(work,MAX_SAMPLE_GAP_MS),stalled};
    frames.push(frame);
    framesSeen++;
    if(stalled)stutters++;
    if(frames.length>limit)frames.shift();
    return true;
  }
  function snapshot(){
    const intervals=frames.map(x=>x.interval),work=frames.map(x=>x.work);
    const totalMs=intervals.reduce((a,b)=>a+b,0);
    return {
      enabled,
      samples:frames.length,
      fps:frames.length&&totalMs>0?Math.round((frames.length*1000/totalMs)*10)/10:null,
      frameP95Ms:percentile(intervals,.95),
      workP95Ms:percentile(work,.95),
      longFrames:frames.filter(x=>x.stalled).length,
      totalFramesSeen:framesSeen,
      totalLongFrames:stutters,
    };
  }
  return {setEnabled,pause,record,snapshot,clear,isEnabled:()=>enabled};
}

// Apenas informações técnicas agregadas, sem user agent, ID, nome, email, token ou endereço.
export function formatPerformanceReport(snapshot,{version='?',quality='?',resolution='?',heapMb=null,cache=null}={}){
  const numeric=(n,suffix='')=>Number.isFinite(n)?`${Math.round(n*10)/10}${suffix}`:'indisponível';
  const data=[
    'STELLAR LEGACY — DIAGNÓSTICO LOCAL',
    `Versão: ${String(version).slice(0,30)}`,
    `Qualidade: ${String(quality).slice(0,24)}`,
    `Resolução de tela: ${String(resolution).slice(0,24)}`,
    `Amostras: ${Math.max(0,Number(snapshot?.samples)||0)}`,
    `FPS observados: ${numeric(snapshot?.fps)}`,
    `Intervalo entre quadros p95: ${numeric(snapshot?.frameP95Ms,' ms')}`,
    `Tempo update + desenho p95: ${numeric(snapshot?.workP95Ms,' ms')}`,
    `Quadros longos (janela): ${Math.max(0,Number(snapshot?.longFrames)||0)}`,
    `Heap JS do navegador: ${numeric(heapMb,' MB')} (se disponível)`,
    `Imagens no cache do jogo: ${Math.max(0,Number(cache?.count)||0)}`,
    `Imagens com falha: ${Math.max(0,Number(cache?.failed)||0)}`,
    'Observação: não mede RAM total, GPU ou latência de rede.',
  ];
  return data.join('\n');
}
