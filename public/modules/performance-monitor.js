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
  let enabled=false,prevAt=null,prevWork=null,prevTickAt=null;
  const rafTicks=[];
  const frames=[];
  const sceneFrames={game:[],settings:[]};
  let prevContext=null;
  let framesSeen=0,stutters=0;
  function clear(){frames.length=0;sceneFrames.game.length=0;sceneFrames.settings.length=0;rafTicks.length=0;framesSeen=0;stutters=0;prevAt=null;prevWork=null;prevContext=null;prevTickAt=null;}
  function setEnabled(value){
    const next=Boolean(value);
    if(enabled!==next){enabled=next;clear();}
  }
  function pause(){prevAt=null;prevWork=null;prevContext=null;prevTickAt=null;}
  function recordTick(at,accepted){
    if(!enabled||!finiteNonnegative(at))return false;
    const time=Number(at),previous=prevTickAt;prevTickAt=time;
    if(previous===null)return false;
    const interval=time-previous;
    if(!Number.isFinite(interval)||interval<=0||interval>MAX_SAMPLE_GAP_MS)return false;
    rafTicks.push({interval,accepted:!!accepted});
    if(rafTicks.length>limit)rafTicks.shift();
    return true;
  }
  function record(at,workMs,targetFps=60,stages=null){
    if(!enabled||!finiteNonnegative(at)||!finiteNonnegative(workMs))return false;
    const time=Number(at),work=Number(workMs),target=Math.max(1,Math.min(240,Number(targetFps)||60));
    const context=stages?.context==='settings'?'settings':'game';
    if(prevAt===null||prevContext!==context){prevAt=time;prevWork=work;prevContext=context;return false;}
    const interval=time-prevAt;
    const wait=prevWork===null?null:Math.max(0,interval-prevWork);
    prevAt=time;prevWork=work;
    // Trocas de aba, bloqueios de tela e suspensão do SO não são travamentos do render.
    if(!Number.isFinite(interval)||interval<=0||interval>MAX_SAMPLE_GAP_MS)return false;
    const threshold=Math.max(80,2500/target);
    const stalled=interval>threshold;
    const frame={interval,work:Math.min(work,MAX_SAMPLE_GAP_MS),stalled,wait,
      update:finiteNonnegative(stages?.updateMs)?Math.min(stages.updateMs,MAX_SAMPLE_GAP_MS):null,
      draw:finiteNonnegative(stages?.drawMs)?Math.min(stages.drawMs,MAX_SAMPLE_GAP_MS):null,
      gameplay:finiteNonnegative(stages?.phases?.gameplayMs)?stages.phases.gameplayMs:null,
      services:finiteNonnegative(stages?.phases?.servicesMs)?stages.phases.servicesMs:null,
      hud:finiteNonnegative(stages?.phases?.hudMs)?stages.phases.hudMs:null,
      hudFull:finiteNonnegative(stages?.phases?.hudFullMs)?stages.phases.hudFullMs:null,
      hudCritical:finiteNonnegative(stages?.phases?.hudCriticalMs)?stages.phases.hudCriticalMs:null,
      hudAmmo:finiteNonnegative(stages?.phases?.hudAmmoMs)?stages.phases.hudAmmoMs:null,
      prep:finiteNonnegative(stages?.phases?.prepMs)?stages.phases.prepMs:null};
    frames.push(frame);
    sceneFrames[context].push(frame);
    if(sceneFrames[context].length>limit)sceneFrames[context].shift();
    framesSeen++;
    if(stalled)stutters++;
    if(frames.length>limit)frames.shift();
    return true;
  }
  function snapshot(context='all'){
    const sampleFrames=context==='game'||context==='settings'?sceneFrames[context]:frames;
    const intervals=sampleFrames.map(x=>x.interval),work=sampleFrames.map(x=>x.work);
    const updates=sampleFrames.map(x=>x.update).filter(Number.isFinite),draws=sampleFrames.map(x=>x.draw).filter(Number.isFinite);
    const nums=k=>sampleFrames.map(f=>f[k]).filter(Number.isFinite);
    const totalMs=intervals.reduce((a,b)=>a+b,0);
    const rafTotal=rafTicks.length,rafSkipped=rafTicks.filter(x=>!x.accepted).length;
    const rafDuration=rafTicks.reduce((sum,x)=>sum+x.interval,0);
    return {
      enabled,
      rafFps:rafTotal&&rafDuration>0?Math.round(rafTotal*10000/rafDuration)/10:null,
      rafP95Ms:percentile(rafTicks.map(x=>x.interval),.95),
      rafTotal,rafSkipped,rafAccepted:rafTotal-rafSkipped,
      samples:sampleFrames.length,
      fps:sampleFrames.length&&totalMs>0?Math.round((sampleFrames.length*1000/totalMs)*10)/10:null,
      frameP95Ms:percentile(intervals,.95),
      workP95Ms:percentile(work,.95),
      updateP95Ms:percentile(updates,.95),
      drawP95Ms:percentile(draws,.95),
      waitP95Ms:percentile(nums('wait'),.95),
      prepP95Ms:percentile(nums('prep'),.95),
      gameplayP95Ms:percentile(nums('gameplay'),.95),
      servicesP95Ms:percentile(nums('services'),.95),
      hudP95Ms:percentile(nums('hud'),.95),
      hudFullP95Ms:percentile(nums('hudFull'),.95),
      hudCriticalP95Ms:percentile(nums('hudCritical'),.95),
      hudAmmoP95Ms:percentile(nums('hudAmmo'),.95),
      hudFullSamples:nums('hudFull').length,
      longFrames:sampleFrames.filter(x=>x.stalled).length,
      totalFramesSeen:framesSeen,
      totalLongFrames:stutters,
    };
  }
  return {setEnabled,pause,recordTick,record,snapshot,clear,isEnabled:()=>enabled};
}

// Apenas informações técnicas agregadas, sem user agent, ID, nome, email, token ou endereço.
export function formatPerformanceReport(snapshot,{version='?',quality='?',resolution='?',heapMb=null,cache=null,scenes=null}={}){
  const numeric=(n,suffix='')=>Number.isFinite(n)?`${Math.round(n*10)/10}${suffix}`:'indisponível';
  const data=[
    'STELLAR LEGACY — DIAGNÓSTICO LOCAL',
    `Qualidade: ${String(quality).slice(0,24)}`,
    `Resolução de tela: ${String(resolution).slice(0,24)}`,
    `Amostras: ${Math.max(0,Number(snapshot?.samples)||0)}`,
    `FPS observados: ${numeric(snapshot?.fps)}`,
    `rAF bruto do navegador (amostras): ${numeric(snapshot?.rafFps)} FPS`,
    `Intervalo rAF bruto p95: ${numeric(snapshot?.rafP95Ms,' ms')}`,
    `Quadros pulados pelo limitador: ${Math.max(0,Number(snapshot?.rafSkipped)||0)} de ${Math.max(0,Number(snapshot?.rafTotal)||0)} chamadas rAF`,
    `FPS jogando: ${numeric(scenes?.game?.fps)} (${Math.max(0,Number(scenes?.game?.samples)||0)} amostras)`,
    `FPS em configurações: ${numeric(scenes?.settings?.fps)} (${Math.max(0,Number(scenes?.settings?.samples)||0)} amostras)`,
    `Intervalo entre quadros p95: ${numeric(snapshot?.frameP95Ms,' ms')}`,
    `Tempo update + desenho p95: ${numeric(snapshot?.workP95Ms,' ms')}`,
    `Tempo atualização JS p95: ${numeric(snapshot?.updateP95Ms,' ms')}`,
    `Tempo desenho Canvas p95: ${numeric(snapshot?.drawP95Ms,' ms')}`,
    `Espera entre quadros p95 (estimativa): ${numeric(snapshot?.waitP95Ms,' ms')}`,
    `Preparação JS p95: ${numeric(snapshot?.prepP95Ms,' ms')}`,
    `Jogabilidade JS p95: ${numeric(snapshot?.gameplayP95Ms,' ms')}`,
    `Serviços e eventos JS p95: ${numeric(snapshot?.servicesP95Ms,' ms')}`,
    `Interface HUD JS p95: ${numeric(snapshot?.hudP95Ms,' ms')}`,
    `HUD completo p95: ${numeric(snapshot?.hudFullP95Ms,' ms')} (${Math.max(0,Number(snapshot?.hudFullSamples)||0)} amostras)`,
    `HUD crítico p95: ${numeric(snapshot?.hudCriticalP95Ms,' ms')}`,
    `HUD munições p95: ${numeric(snapshot?.hudAmmoP95Ms,' ms')}`,
    `Quadros longos (janela): ${Math.max(0,Number(snapshot?.longFrames)||0)}`,
    `Heap JS do navegador: ${numeric(heapMb,' MB')} (se disponível)`,
    `Imagens no cache do jogo: ${Math.max(0,Number(cache?.count)||0)}`,
    `Imagens com falha: ${Math.max(0,Number(cache?.failed)||0)}`,
    'Observação: rAF bruto é uma medida das chamadas recebidas do navegador; o limitador descarta parte delas. Jogando e configurações mantêm históricos separados que podem ser de sessões anteriores (até 240 amostras cada). Espera entre quadros não mede a GPU, RAM total ou latência de rede.',
  ];
  return data.join('\n');
}
