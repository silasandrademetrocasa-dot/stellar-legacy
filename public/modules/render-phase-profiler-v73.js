// V73: perfil visual opt-in. Não modifica o canvas nem os sistemas de jogo.
const percentile=(values,p)=>{
  if(!values.length)return null;
  const sorted=[...values].sort((a,b)=>a-b);
  return sorted[Math.min(sorted.length-1,Math.ceil(sorted.length*p)-1)];
};
const KEYS=['background','structures','actors','effects','minimap'];
export function createRenderPhaseProfilerV73({capacity=120}={}){
  const data=Object.fromEntries(KEYS.map(k=>[k,[]]));
  let samples=0;
  return {
    record(frame){
      if(!frame)return;
      samples++;
      for(const key of KEYS){
        const v=Number(frame[key]);
        if(!Number.isFinite(v)||v<0)continue;
        const list=data[key];list.push(v);
        if(list.length>capacity)list.shift();
      }
    },
    clear(){samples=0;for(const key of KEYS)data[key].length=0;},
    snapshot(){
      const result={samples};
      for(const key of KEYS){
        const list=data[key];result[key+'P95Ms']=percentile(list,.95);
        result[key+'P99Ms']=percentile(list,.99);
      }
      return result;
    }
  };
}
