// Stellar Legacy V75 — medição A/B opt-in, somente desenho. Nenhuma regra do jogo muda.
// Sem timer próprio, sem localStorage, sem transmissão; tempo é observado no loop existente.
export const VISUAL_TEST_MODES_V75 = Object.freeze({
  normal:'Padrão (controle)',
  scenery:'Sem cenário de fundo',
  baseportal:'Sem desenho de bases e portais',
  relay:'Sem desenho dos relés',
  effects:'Sem efeitos opcionais',
  minimap:'Sem desenho do minimapa',
  hud:'Sem painéis secundários do HUD',
});
const valid=mode=>Object.hasOwn(VISUAL_TEST_MODES_V75,mode);
const p95=list=>{
  if(!list.length)return null;
  const a=[...list].sort((x,y)=>x-y);
  return a[Math.ceil(.95*a.length)-1];
};
const avg=list=>list.reduce((sum,v)=>sum+v,0)/Math.max(1,list.length);
const f=value=>Number.isFinite(value)?value.toFixed(1):'n/d';
export function createVisualIsolationV75({durationMs=35000,warmupMs=1500,maxSamples=1500}={}){
  let active=null; let last=null; let reason=''; const results=[];
  const mode=()=>active&&active.beganAt!==null?active.mode:'normal';
  function start(which){
    if(!valid(which))return false;
    active={mode:which,createdAt:null,beganAt:null,mapId:'',quality:'',width:0,height:0,intervals:[],works:[],draws:[],updates:[],count:0};
    reason='Aguardando fechar Configurações e voltar ao mapa';
    return true;
  }
  function reset(){active=null;results.length=0;reason='Histórico apagado; desenho normal restaurado';}
  function stop(message='Restaurado pelo jogador'){
    if(!active)return false;
    active=null;reason=message;return true;
  }
  function frame(now,{visible=true,inSettings=false,mapId='',quality='',width=0,height=0,intervalMs=0,workMs=0,drawMs=0,updateMs=0}={}){
    if(!active)return null;
    if(!visible){stop('Teste cancelado: aba oculta');return 'cancelled';}
    if(inSettings||!mapId)return null;
    if(active.beganAt===null){
      active.beganAt=now;active.mapId=String(mapId);active.quality=String(quality);active.width=width;active.height=height;
      reason='Teste em execução';return 'started';
    }
    if(String(mapId)!==active.mapId||String(quality)!==active.quality||width!==active.width||height!==active.height){
      stop('Teste cancelado: mapa, qualidade ou resolução alterados');return 'cancelled';
    }
    const elapsed=now-active.beganAt;
    if(elapsed>=warmupMs&&elapsed<=durationMs){
      if(active.intervals.length<maxSamples&&Number.isFinite(intervalMs)&&intervalMs>0){
        active.intervals.push(intervalMs);active.works.push(Math.max(0,workMs));active.draws.push(Math.max(0,drawMs));active.updates.push(Math.max(0,updateMs));
      }
    }
    if(elapsed<durationMs)return null;
    const samples=active.intervals.length;
    const result={mode:active.mode,label:VISUAL_TEST_MODES_V75[active.mode],mapId:active.mapId,quality:active.quality,canvas:`${width}x${height}`,
      seconds:Math.round(elapsed/1000),samples,
      fps:samples>1?1000/avg(active.intervals):null,
      intervalP95:p95(active.intervals),workP95:p95(active.works),drawP95:p95(active.draws),updateP95:p95(active.updates)};
    results.push(result);if(results.length>12)results.shift();last=result;active=null;
    reason=samples<30?'Teste concluído com poucas amostras; repita em cena estável':'Teste concluído; visual normal restaurado';
    return 'completed';
  }
  function snapshot(now=0){return {mode:mode(),pending:!!active&&active.beganAt===null,active:!!active,
    remainingSeconds:active&&active.beganAt!==null?Math.max(0,Math.ceil((durationMs-(now-active.beganAt))/1000)):null,
    reason,results:results.map(x=>({...x})),last:last?{...last}:null};}
  function report(){
    const lines=['V75 — TESTE A/B LOCAL (não mede GPU e não envia dados)'];
    if(active)lines.push('Em execução: '+VISUAL_TEST_MODES_V75[active.mode]);
    if(!results.length)lines.push('Sem testes concluídos');
    for(const r of results){
      lines.push(`${r.label} | ${r.mapId} | ${r.quality} | ${r.canvas} | ${r.seconds}s | ${r.samples} quadros | FPS ${f(r.fps)} | intervalo P95 ${f(r.intervalP95)}ms | trabalho P95 ${f(r.workP95)}ms | Canvas P95 ${f(r.drawP95)}ms | update P95 ${f(r.updateP95)}ms`);
    }
    const controls=results.filter(x=>x.mode==='normal');
    const baseline=controls.at(-1);
    if(baseline)for(const r of results.filter(x=>x.mode!=='normal')){
      if(r.mapId===baseline.mapId&&r.quality===baseline.quality&&r.canvas===baseline.canvas&&baseline.fps>0){
        const delta=(r.fps/baseline.fps-1)*100;
        lines.push(`Comparação ${r.label} com controle: ${delta>=0?'+':''}${f(delta)}% FPS (não causal sem repetição)`);
      }
    }
    lines.push('Compare na mesma cena, orientação e qualidade. Restaurar visual é automático em 35 s.');
    return lines.join('\n');
  }
  return {start,stop,reset,frame,snapshot,report,mode};
}
