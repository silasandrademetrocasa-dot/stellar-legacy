// Stellar Legacy V46.2 — Procedural audio, zero external assets.
// Cached noise, bounded voices and per-effect cooldowns keep combat mobile-friendly.
export const STELLAR_SFX_KINDS=Object.freeze([
  'laser','petLaser','rocket','impact','shield','explosion','pickup',
  'portal','ability','reward','target','warning','repair','ui',
  'critical','event','ore','boss','engine','laserHeavy','portalPvp','portalAstral','shieldBreak'
]);
const COOLDOWN=Object.freeze({
  laser:115,petLaser:160,rocket:220,impact:100,shield:140,
  explosion:250,pickup:145,portal:750,ability:280,reward:450,
  target:210,warning:600,repair:1200,ui:70,critical:240,
  event:650,ore:270,boss:1100,engine:2450,laserHeavy:115,portalPvp:800,portalAstral:850,shieldBreak:1200
});
const PRESETS=Object.freeze({
  cinematic:{voices:14,gain:1,layers:3},
  balanced:{voices:10,gain:.80,layers:2},
  lite:{voices:5,gain:.66,layers:1}
});
export function createStellarAudio(getSettings=()=>({enabled:true,volume:.7,profile:'cinematic'})){
  let context=null,output=null,noiseBuffer=null,voices=0;
  const lastAt=new Map();
  function settings(){
    const s=getSettings()||{};
    const profile=PRESETS[s.profile]?s.profile:'balanced';
    return {enabled:s.enabled!==false,volume:Math.max(0,Math.min(1,Number(s.volume??.7)||0)),profile};
  }
  function ensure(){
    if(!settings().enabled||settings().volume<=0)return null;
    if(typeof document!=='undefined'&&document.visibilityState==='hidden')return null;
    const Ctor=globalThis.AudioContext||globalThis.webkitAudioContext;
    if(!Ctor)return null;
    try{
      if(!context){
        context=new Ctor({latencyHint:'interactive'});
        const compressor=context.createDynamicsCompressor();
        compressor.threshold.value=-14;compressor.knee.value=18;compressor.ratio.value=4;
        compressor.attack.value=.002;compressor.release.value=.16;
        output=context.createGain();output.connect(compressor);compressor.connect(context.destination);
      }
      if(context.state==='suspended')context.resume().catch(()=>{});
      return context;
    }catch{return null;}
  }
  function random(min,max){return min+Math.random()*(max-min);}
  function maxVoices(){return PRESETS[settings().profile].voices;}
  function gain(v){return Math.max(.00015,Math.min(.24,(settings().volume**1.35)*.19*PRESETS[settings().profile].gain*v));}
  function beginSource(source,tail){
    voices++;
    source.onended=()=>{voices=Math.max(0,voices-1);try{source.disconnect();}catch{}};
    source.stop(tail);
  }
  function tone(start,end,duration,type='sine',amount=.5,delay=0){
    const ac=ensure();if(!ac||voices>=maxVoices())return;
    const t=ac.currentTime+Math.max(0,delay),d=Math.max(.025,duration);
    const o=ac.createOscillator(),g=ac.createGain();
    o.type=type;
    o.frequency.setValueAtTime(Math.max(28,start),t);
    o.frequency.exponentialRampToValueAtTime(Math.max(28,end),t+d);
    g.gain.setValueAtTime(.0001,t);
    g.gain.exponentialRampToValueAtTime(gain(amount),t+Math.min(.012,d*.2));
    g.gain.exponentialRampToValueAtTime(.0001,t+d);
    o.connect(g);g.connect(output);o.start(t);beginSource(o,t+d+.015);
  }
  function noise(duration=.13,amount=.55,lowpass=1400,delay=0,highpass=false){
    const ac=ensure();if(!ac||voices>=maxVoices())return;
    if(!noiseBuffer){
      // Generated only once per page session (not on every shot).
      const length=Math.ceil(ac.sampleRate*.62);
      noiseBuffer=ac.createBuffer(1,length,ac.sampleRate);
      const data=noiseBuffer.getChannelData(0);
      for(let i=0;i<length;i++)data[i]=Math.random()*2-1;
    }
    const d=Math.max(.025,Math.min(.55,duration)),t=ac.currentTime+Math.max(0,delay);
    const source=ac.createBufferSource(),filter=ac.createBiquadFilter(),g=ac.createGain();
    source.buffer=noiseBuffer;
    filter.type=highpass?'highpass':'lowpass';filter.frequency.value=lowpass;
    g.gain.setValueAtTime(.0001,t);
    g.gain.exponentialRampToValueAtTime(gain(amount),t+Math.min(.012,d*.15));
    g.gain.exponentialRampToValueAtTime(.0001,t+d);
    source.connect(filter);filter.connect(g);g.connect(output);
    source.start(t,random(0,Math.max(.005,.62-d-.01)));
    beginSource(source,t+d+.01);
  }
  function play(kind,{force=false}={}){
    const s=settings();if(!s.enabled||s.volume<=0)return false;
    const now=typeof performance!=='undefined'?performance.now():Date.now();
    const cooldown=COOLDOWN[kind];if(cooldown===undefined)return false;
    if(!force&&now-(lastAt.get(kind)??-Infinity)<cooldown)return false;
    const ac=ensure();if(!ac)return false;
    lastAt.set(kind,now);
    const p=PRESETS[s.profile],rich=p.layers>=3,mid=p.layers>=2;
    const v=random(.955,1.055);
    switch(kind){
      case 'laser':
        tone(1180*v,330*v,.105,'sawtooth',.51);
        if(mid)tone(1840*v,750*v,.055,'square',.16,.009);
        if(rich)noise(.05,.14,4400,.012,true);break;
      case 'petLaser':
        tone(1550*v,610*v,.073,'triangle',.35);
        if(rich)tone(2150*v,930*v,.039,'square',.12,.007);break;
      case 'rocket':
        tone(210*v,62*v,.25,'sawtooth',.49);
        if(mid)noise(.24,.46,760);
        if(rich)tone(880*v,155*v,.19,'triangle',.22,.035);break;
      case 'impact':
        noise(.073,.36,2200);
        if(mid)tone(220*v,84*v,.082,'triangle',.34);break;
      case 'shield':
        tone(1060*v,320*v,.16,'sine',.40);
        if(mid)tone(1820*v,850*v,.095,'triangle',.20,.028);break;
      case 'explosion':
        noise(.39,.72,1100);
        if(mid)tone(125*v,34,.40,'sawtooth',.56);
        if(rich)noise(.19,.26,290,.065);break;
      case 'pickup':
        tone(460*v,680*v,.095,'sine',.27);
        if(mid)tone(730*v,1060*v,.105,'triangle',.24,.07);break;
      case 'portal':
        tone(90,780*v,.49,'sine',.53);
        if(mid)tone(190,1480*v,.37,'triangle',.23,.14);
        if(rich)noise(.30,.17,1050,.17);break;
      case 'ability':
        tone(205*v,1020*v,.26,'sawtooth',.46);
        if(mid)tone(460*v,1460*v,.17,'sine',.23,.085);break;
      case 'reward':
        tone(392,587,.135,'sine',.31);
        tone(523,784,.145,'sine',.31,.14);
        if(mid)tone(784,1175,.22,'triangle',.27,.29);break;
      case 'target':
        tone(690*v,910*v,.06,'square',.16);
        if(mid)tone(930*v,1220*v,.08,'sine',.15,.047);break;
      case 'warning':
        tone(260,145,.22,'sawtooth',.40);
        if(mid)tone(245,120,.22,'sawtooth',.30,.26);break;
      case 'repair':
        tone(300,650,.14,'sine',.18);
        if(mid)tone(580,1010,.12,'triangle',.16,.07);break;
      case 'ui':tone(510,670,.037,'sine',.13);break;
      case 'critical':
        tone(230*v,1250*v,.15,'sawtooth',.49);
        if(mid)noise(.10,.32,3100,.045,true);
        if(rich)tone(1480,560,.16,'triangle',.21,.075);break;
      case 'event':
        tone(110,870,.37,'sine',.42);
        if(mid)tone(590,1550,.24,'triangle',.27,.14);break;
      case 'ore':
        tone(230*v,420*v,.07,'triangle',.34);
        if(mid)noise(.095,.28,1600,.035);
        if(rich)tone(600,390,.105,'sine',.16,.07);break;
      case 'engine':
        tone(78*v,112*v,.24,'triangle',.16);
        if(rich)tone(125*v,96*v,.19,'sine',.10,.06);break;
      case 'laserHeavy':
        tone(1450*v,240*v,.14,'sawtooth',.66);
        if(mid)tone(2150*v,560*v,.10,'square',.24,.012);
        if(rich)noise(.08,.18,4700,.01,true);break;
      case 'portalPvp':
        tone(310*v,85*v,.42,'sawtooth',.45);
        if(mid)tone(110,760,.40,'triangle',.34,.14);break;
      case 'portalAstral':
        tone(78,940,.52,'sine',.49);
        if(mid)tone(130,1400*v,.43,'triangle',.27,.08);
        if(rich)tone(620,1720,.26,'sine',.18,.25);break;
      case 'shieldBreak':
        noise(.23,.46,2250);
        if(mid)tone(840*v,96*v,.26,'square',.35,.045);break;
      case 'boss':
        tone(82,46,.50,'sawtooth',.57);
        if(mid)noise(.45,.40,520,.05);
        if(rich)tone(320,65,.39,'triangle',.31,.12);break;
    }
    return true;
  }
  function unlock(){ensure();}
  function dispose(){lastAt.clear();if(context){context.close().catch(()=>{});context=null;output=null;noiseBuffer=null;voices=0;}}
  return Object.freeze({play,unlock,dispose});
}
