// V47.0.0 Combat Reborn — strictly client-side cosmetics and local NPC movement.
// Does NOT calculate rewards, damage, server authority, inventory or topology.
export const COMBAT_REBORN_FEATURES=Object.freeze([
  'impact-cues','explosion-rings','boss-telegraphs','npc-flanking',
  'portal-signatures','mobile-fx-budget','player-engine-audio'
]);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function rebornFxBudgetV470({quality='high',mobile=false,enabled=true}={}){
  if(!enabled)return 0;
  if(quality==='low')return mobile?3:5;
  if(quality==='medium')return mobile?9:12;
  return mobile?12:22;
}
export function npcTacticalDriftV470(npc,{dx=0,dy=0,d=Infinity,dt=0,now=0,safe=false}={}){
  // Only active when the existing game has already authorized a chase.
  // No additional aggression, range, damage, attack cadence or speed increase.
  if(safe||npc?.sharedWorld||npc?.isPlayer||!Number.isFinite(d)||d<150||
    d>Math.min(760,Number(npc?.aggroRange)||0)||!(Number(npc?.speed)>0)||dt<=0)return {x:0,y:0};
  const type=String(npc?.type||'').toLowerCase();
  const boss=type.startsWith('boss');
  const elite=boss||type.includes('elite')||!!npc?.gateEnemy||!!npc?.eventNpc;
  if(!elite)return {x:0,y:0};
  const dist=Math.max(1,Math.hypot(dx,dy));
  const sign=(String(npc?.id||npc?.name||'x').length%2===0)?1:-1;
  const wobble=Math.sin((now*0.65)+(Number(npc?.size)||20)*.08);
  const step=Math.max(0,Math.min(0.045,dt));
  const orbitSpeed=Math.min(40,Number(npc.speed)*(boss?.14:.20));
  return {x:(-dy/dist)*orbitSpeed*step*wobble*sign,y:(dx/dist)*orbitSpeed*step*wobble*sign};
}
export function portalSignatureV470(portal){
  const label=String(portal?.targetLabel||portal?.to||'').toUpperCase();
  if(/AURORA|NEXUS|ECLIPSE|ASTRAL|ALPHA|BETA|GAMMA/.test(label))return 'astral';
  if(/^(?:4-[123]|B4[123])$/.test(label)||portal?.battle||portal?.pvp)return 'pvp';
  return 'normal';
}
export function drawPortalSignatureV470(ctx,portal,{quality='high',time=0,mobile=false}={}){
  const type=portalSignatureV470(portal);
  const low=quality==='low';
  const color=type==='pvp'?'#ff6c85':type==='astral'?'#bda1ff':'#64e8ff';
  ctx.save();ctx.strokeStyle=color;ctx.fillStyle=color;
  ctx.lineWidth=low?1.6:1.9;ctx.globalAlpha=low?.65:.74;
  if(!low&&!mobile){ctx.shadowColor=color;ctx.shadowBlur=7;}
  const y=-80;
  if(type==='pvp'){
    ctx.beginPath();ctx.moveTo(0,y-8);ctx.lineTo(7,y+5);ctx.lineTo(-7,y+5);ctx.closePath();ctx.stroke();
    ctx.beginPath();ctx.moveTo(0,y-4);ctx.lineTo(0,y+1);ctx.stroke();
  }else if(type==='astral'){
    ctx.beginPath();ctx.arc(0,y,6+Math.sin(time*2)*.6,0,Math.PI*2);ctx.stroke();
    ctx.beginPath();ctx.moveTo(-9,y);ctx.lineTo(9,y);ctx.moveTo(0,y-9);ctx.lineTo(0,y+9);ctx.stroke();
  }else{
    ctx.beginPath();ctx.moveTo(-7,y);ctx.lineTo(6,y);ctx.lineTo(2,y-4);ctx.moveTo(6,y);ctx.lineTo(2,y+4);ctx.stroke();
  }
  ctx.restore();
}
export function createCombatRebornV470({clock=()=>typeof performance!=='undefined'?performance.now():Date.now()}={}){
  const fx=[];const cooldowns=new Map();
  function emit(kind,x,y,{quality='high',mobile=false,color=null,size=28,enabled=true}={}){
    const budget=rebornFxBudgetV470({quality,mobile,enabled});
    if(budget<=0||!Number.isFinite(x)||!Number.isFinite(y))return false;
    const now=clock(),ms={hit:110,shield:140,blast:200,boss:1300,threat:500,portal:450}[kind]||150;
    const key=kind+':'+Math.round(x/75)+':'+Math.round(y/75);
    if(now-(cooldowns.get(key)??-Infinity)<ms)return false;
    cooldowns.set(key,now);
    if(cooldowns.size>80)cooldowns.clear();
    const duration=kind==='boss'?.95:kind==='blast'?.54:kind==='portal'?.6:.35;
    if(fx.length>=budget)fx.shift();
    fx.push({kind,x,y,size:clamp(size,8,150),color:color||(kind==='shield'?'#72e6ff':kind==='threat'?'#ff536b':'#ffac7c'),life:duration,ttl:duration});
    return true;
  }
  function tick(dt){
    if(!Number.isFinite(dt)||dt<=0)return;
    for(let i=fx.length-1;i>=0;i--){fx[i].life-=dt;if(fx[i].life<=0)fx.splice(i,1);}
  }
  function clear(){fx.length=0;cooldowns.clear();}
  function draw(ctx,project,{quality='high',mobile=false,enabled=true}={}){
    if(!enabled||fx.length===0||!ctx||typeof project!=='function')return;
    const low=quality==='low';const visible=Math.min(fx.length,rebornFxBudgetV470({quality,mobile,enabled}));
    for(let i=Math.max(0,fx.length-visible);i<fx.length;i++){
      const f=fx[i],p=project(f.x,f.y);
      if(!p||!Number.isFinite(p.x)||!Number.isFinite(p.y))continue;
      const progress=clamp(1-f.life/f.ttl,0,1),fade=1-progress;
      const radius=f.size*(.55+progress*.85);
      ctx.save();ctx.translate(p.x,p.y);ctx.globalAlpha=fade*(low?.65:.82);ctx.strokeStyle=f.color;ctx.lineWidth=low?1.6:2.1;
      if(!low&&!mobile){ctx.shadowColor=f.color;ctx.shadowBlur=8;}
      if(f.kind==='threat'){
        ctx.setLineDash([6,5]);ctx.beginPath();ctx.arc(0,0,radius*1.35,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
      }else if(f.kind==='boss'){
        ctx.beginPath();ctx.arc(0,0,radius*1.20,0,Math.PI*2);ctx.stroke();
        if(!low){ctx.beginPath();ctx.arc(0,0,radius*.72,0,Math.PI*2);ctx.stroke();}
      }else if(f.kind==='shield'){
        ctx.beginPath();ctx.ellipse(0,0,radius,radius*.76,0,0,Math.PI*2);ctx.stroke();
      }else{
        ctx.beginPath();ctx.arc(0,0,radius,0,Math.PI*2);ctx.stroke();
        if(!low&&(f.kind==='hit'||f.kind==='blast')){
          ctx.beginPath();ctx.moveTo(-radius*.6,0);ctx.lineTo(radius*.6,0);
          ctx.moveTo(0,-radius*.6);ctx.lineTo(0,radius*.6);ctx.stroke();
        }
      }
      ctx.restore();
    }
  }
  return Object.freeze({emit,tick,draw,clear,count:()=>fx.length});
}
