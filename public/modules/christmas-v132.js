// Shared, deterministic catalogue. Rewards are granted only by the server.
export const SEASON='natal-2026';
export const SEASON_START=Date.parse('2026-11-07T03:00:00Z');
export const SEASON_END=Date.parse('2027-01-06T03:00:00Z');
export const isChristmas=(now=Date.now())=>now>=SEASON_START&&now<SEASON_END;
export const NPCS={
 natalFloco:{name:'Floco',hp:40000,shield:20000,damage:1500,speed:90,credits:180000,uridium:150,xp:5000,size:24},
 natalNevasca:{name:'Nevasca',hp:160000,shield:120000,damage:4500,speed:85,credits:550000,uridium:450,xp:18000,size:33},
 natalGlacial:{name:'Glacial',hp:450000,shield:450000,damage:10000,speed:40,credits:1500000,uridium:1100,xp:50000,size:44},
 natalRei:{name:'Rei do Inverno',hp:5000000,shield:3500000,damage:26000,speed:35,credits:12000000,uridium:8000,xp:400000,size:85}
};
export const DESIGNS=[];
function add(ship,name,key,bonuses,atlas,cell,source='shop',price=100000){DESIGNS.push({design_id:`n132_${ship}_${key}`,kind:'ship',name,rarity:'epic',enabled:true,eligibility:{elite_or_event:true,ship_id:ship,source},bonuses,ability:{},visual:{atlas,cell,glow:'#c9eaff'},price});}
add('aegis','Seraph • Solstice','solstice',{damage:.14,shield:.12,hp:.05},'elite',1,'shop',200000);
add('citadel','Bulwark • Arctic','arctic',{damage:.10,shield:.18,hp:.06},'elite',3,'shop',200000);
add('defcom','Phantom • Midnight','midnight',{damage:.15,shield:.11,speed:.05},'elite',5,'shop',200000);
add('spearhead','Pathfinder • Orion','orion',{damage:.12,shield:.10,hp:.05},'elite',7,'shop',200000);
add('yamato','Kensei • Crimson','crimson',{damage:.16,shield:.13,speed:.06},'elite',9,'shop',200000);
add('spearhead','Pathfinder • Cristal','cristal',{damage:.18,shield:.16,hp:.08},'elite',10,'december_pass',0);
add('yamato','Kensei • Vulcão Natalino','vulcao',{damage:.20,shield:.15,speed:.08},'elite',11,'december_pass',0);
// Attribute skins belong to their own hull; retired universal ship_* skins stay retired.
for(const [ship,label] of [['leonov','Lynx'],['vengeance','Valkyrie'],['goliath','Leviathan'],['pusat','Striker']]){
 for(const [key,name,value] of [['hp','Vitalis',.15],['damage','Reaper',.08],['shield','Barrier',.15],['xp','Scholar',.15],['speed','Velocity',.05]])
  add(ship,`${label} • ${name}`,key,{[key]:value},'v138',0);
}
for(const [key,name] of [['br','Brasil'],['us','Estados Unidos'],['jp','Japão'],['es','Espanha'],['pt','Portugal']])
 add('goliath',`Leviathan • ${name}`,key,{hp:.08,shield:.08,damage:.04},'v138',0,'shop',150000);
export const BASE_ART={aegis:0,citadel:2,defcom:4,spearhead:6,yamato:8};
export function compatibleDesign(d,ship){return d?.kind==='ship'&&d.eligibility?.ship_id===ship;}
export const MISSIONS=[
 {id:'scout',name:'Primeira nevasca',npc:20,box:10,boss:0,reward:{credits:1000000,uridium:1000,cores:1,fireworks:3}},
 {id:'guardian',name:'Patrulha de inverno',npc:100,box:50,boss:0,reward:{credits:3000000,uridium:2500,cores:2,fireworks:5}},
 {id:'king',name:'Defensores do Natal',npc:250,box:100,boss:1,reward:{credits:6000000,uridium:5000,cores:3,fireworks:10}}
];
export function christmasWindow(now,resolveMain){
 if(!isChristmas(now))return null;
 const day=Math.floor((now-10800000)/86400000)*86400000+10800000;
 const slots=[13,16,19,22];
 for(let i=0;i<slots.length;i++){
  const start=day+slots[i]*3600000+300000,end=start+3000000;
  if(now<start||now>=end)continue;
  // Check the entire window plus five-minute margins, not merely the current instant.
  for(let t=start-300000;t<end+300000;t+=60000)if(resolveMain(t))return null;
  const pvp=i%2===1,map=pvp?`b4${1+((Math.floor(day/86400000)*2+(i===3?1:0))%3+3)%3}`:'x4';
  return {id:pvp?'natal_pvp':'natal_x4',name:pvp?'TRONO CONGELADO':'INVASÃO DO INVERNO',icon:'❄',start,end,eventId:`${SEASON}:${start}`,target:999999,reward:{},rules:{christmas:true,map,season:SEASON},desc:pvp?`Rei do Inverno • ${map.replace('b','').split('').join('-')}`:'Natal nos mapas 1-4, 2-4 e 3-4'};
 }
 return null;
}
export function rollChristmasBox(rewards,rng=Math.random){
 const pool=rewards.filter(r=>r.weight>0&&['ammo','credits','uridium','stellarDust'].includes(r.kind));
 if(!pool.length)throw Error('Tabela de recompensas vazia');
 let n=rng()*pool.reduce((s,r)=>s+r.weight,0),pick=pool.at(-1);
 for(const r of pool){n-=r.weight;if(n<0){pick=r;break;}}
 const qty=2*(pick.min+Math.floor(rng()*(pick.max-pick.min+1))),roll=rng();
 return {kind:pick.kind,id:pick.id||null,qty,cores:roll<.01?2:roll<.05?1:0};
}
export function fireworkReady(last,now=Date.now()){return !last||now-last>=5000;}
