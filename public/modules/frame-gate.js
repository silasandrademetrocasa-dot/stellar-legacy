// Stellar Legacy — FPS livre para Baixa, Media e Alta.
// A taxa maxima passa a ser definida pelo requestAnimationFrame do navegador,
// frequencia da tela e capacidade do aparelho, nao pela qualidade visual.
// Nao altera dt, simulacao, economia, persistencia nem ciclos de jogo.
// O limitador legado pode ser explicitamente habilitado para casos especiais.
export function createFrameGate({toleranceMs=1.5,enforceCap=false}={}){
  const tolerance=Math.max(0,Math.min(2,Number(toleranceMs)||0));
  const throttled=enforceCap===true;
  let last=null;
  return {
    reset(at=null){last=Number.isFinite(at)?at:null;},
    accept(at,targetFps=60){
      if(!Number.isFinite(at))return false;
      if(last===null){last=at;return true;}
      const elapsed=at-last;
      if(elapsed<0||elapsed>1500){last=at;return true;}
      // Callback duplicado com timestamp identico nao e um quadro novo.
      if(elapsed===0)return false;
      // Normalmente todos os quadros reais do rAF sao processados,
      // independente de FPS nominal do perfil grafico.
      if(!throttled){last=at;return true;}
      // Caminho opcional para testes/consumidores que solicitarem um teto explicito.
      const fps=Math.max(1,Math.min(120,Number(targetFps)||60));
      const targetMs=1000/fps;
      if(elapsed+Math.min(tolerance,targetMs*.10)<targetMs)return false;
      last=at;
      return true;
    },
  };
}
