#!/usr/bin/env node
// Patch incremental, idempotente; aplicado na verificacao do Instalador Universal.
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const BASE='42.6.2',NEXT='43.1.0';
function edit(path,change){const full=resolve(ROOT,path),before=readFileSync(full,'utf8'),after=change(before);if(before!==after)writeFileSync(full,after,'utf8');}
function requireText(s,part,file){if(!s.includes(part))throw Error('Combat Evolution: integracao ausente em '+file+': '+part.slice(0,120));}
function spliceOnce(s,anchor,addition,file){requireText(s,anchor,file);return s.includes(addition)?s:s.replace(anchor,addition+anchor);}
edit('server/index.js',s=>{
 if(!s.includes("from './astral-combat-v431.js'"))s="import {attachAstralCombatV431} from './astral-combat-v431.js';\n"+s;
 s=s.replace("const RELEASE_VERSION = '"+BASE+"'","const RELEASE_VERSION = '"+NEXT+"'");
 requireText(s,"const RELEASE_VERSION = '"+NEXT+"'",'server/index.js');
 s=spliceOnce(s,'// V19.0.9 • Catálogo único de balanceamento validado pelo Supabase.',
  'attachAstralCombatV431(app,{requireUser,asyncRoute});\n\n','server/index.js');
 const anchor='  readRelayLoadout:async userId=>{';
 if(!s.includes('readAstralCombatProfile:async userId=>{')){
  requireText(s,anchor,'server/index.js');
  s=s.replace(anchor,`  readAstralCombatProfile:async userId=>{
    const {data,error}=await (await requireEliteAdmin()).rpc('stellar_u431_combat_profile',{p_user:userId});
    if(error)throw new Error('Perfil de combate indisponível.');
    return data;
  },
`+anchor);
 }
 return s;
});
edit('server/world.js',s=>{
 if(!s.includes("from './astral-combat-v431.js'"))s="import {safeAstralProfileV431,astralNpcHitCapV431} from './astral-combat-v431.js';\n"+s;
 const params='damageRelay,readRelayLoadout,loadActorClan';
 if(!s.includes('damageRelay,readRelayLoadout,readAstralCombatProfile,loadActorClan')){
  requireText(s,params,'server/world.js');s=s.replace(params,'damageRelay,readRelayLoadout,readAstralCombatProfile,loadActorClan');
 }
 const option='    readRelayLoadout:readRelayLoadout||(()=>Promise.reject(new Error("Leitura de equipamentos não configurada"))),';
 if(!s.includes('readAstralCombatProfile:readAstralCombatProfile||')){
  requireText(s,option,'server/world.js');s=s.replace(option,option+"\n    readAstralCombatProfile:readAstralCombatProfile||null,");
 }
 const anchor="    let amount=clamp(msg.damage,0,ws.identity?.isAdmin===true?5000000:2000000);if(amount<=0)return;";
 if(!s.includes('/* ASTRAL_NPC_HIT_GUARD_V431 */')){
  requireText(s,anchor,'server/world.js');s=s.replace(anchor,anchor+`
    /* ASTRAL_NPC_HIT_GUARD_V431 */
    // Na ativacao de dano Astral, a sala confere o modulo e o teto a partir
    // do inventario salvo. Enquanto a funcionalidade estiver pausada,
    // preserva-se integralmente a regra de dano anterior.
    if(ws.identity?.isAdmin!==true&&String(msg.mode||'damage')==='damage'&&this.world.readAstralCombatProfile){
      try{
        const cached=ws._astralCombatV431;
        if(!cached||now-cached.at>12000){
          const profile=safeAstralProfileV431(await this.world.readAstralCombatProfile(p.userId));
          const save=profile.npcDamagePercent>0?await this.world.readRelayLoadout(p.userId):null;
          ws._astralCombatV431={at:now,profile,save};
        }
        const verified=ws._astralCombatV431;
        if(verified?.profile?.npcDamagePercent>0){
          const baseline=relayShipLoadoutDamage(verified.save,p.laserAmmoId).laserDamage;
          const cap=astralNpcHitCapV431(baseline,verified.profile.npcDamagePercent);
          if(cap!==null&&amount>cap){
            this.world.recordSecurityViolation?.(p.userId,{code:'ASTRAL_NPC_HIT_BOUND',severity:'warn',evidence:{map:String(this.mapId),reported:Math.round(amount),cap}},'astral_combat').catch(()=>{});
            return safeJsonSend(ws,{type:'damage_result',hitId:msg.hitId||null,entityId:e.id,actual:0,rejected:'damage_limit'});
          }
        }
      }catch(err){
        // Nao desconectar piloto por oscilacao do banco; sem melhoria Astral
        // autorizada neste momento. A auditoria e o alerta permanecem no servidor.
        if(!ws._astralCombatWarnAt||now-ws._astralCombatWarnAt>30000){ws._astralCombatWarnAt=now;console.warn('[astral-combat]',String(err?.message||err).slice(0,100));}
      }
    }
    // Um alvo pode morrer enquanto a consulta de perfil aguarda resposta.
    if(!this.npcs.has(e.id)||e.hp<=0||ws.player!==p||!this.playerFresh(p))return;
`);
 }
 return s;
});
edit('public/api.js',s=>{
 if(!s.includes('export async function adminAstralPowerV431(')){
  requireText(s,'async function authedServerFetch(','public/api.js');
  s+=`\n// Regulagem da tecnologia Astral, com autorizacao de ADM no banco.
export async function adminAstralPowerV431(enabled){return authedServerFetch('/api/admin/frontier/astral-power',{method:'POST',body:JSON.stringify({enabled})});}\n`;
 }
 return s;
});
edit('public/game.js',s=>{
 s=s.replaceAll('?v='+BASE,'?v='+NEXT);
 const header="import {loadStageAV423 as loadAstralBattleSnapshotV431} from './api.js?v="+NEXT+"';\nimport {verifiedAstralPveBonusV431} from './modules/astral-combat-v431.js?v="+NEXT+"';\n";
 if(!s.includes('loadAstralBattleSnapshotV431'))s=header+s;
 const anchor='function computeStats(keepRatio=true){';
 if(!s.includes('function refreshAstralCombatV431(){')){
  requireText(s,anchor,'public/game.js');
  s=s.replace(anchor,`const astralCombatV431={snapshot:null,owner:null,request:0};
async function refreshAstralCombatV431(){
 if(!authenticated||!progress||!getUser()?.id)return;
 const owner=getUser().id,req=++astralCombatV431.request;
 try{
  const snapshot=await loadAstralBattleSnapshotV431();
  if(req!==astralCombatV431.request||owner!==getUser()?.id||!authenticated||!progress)return;
  astralCombatV431.snapshot=snapshot;astralCombatV431.owner=owner;
  // Nunca recarregar HP/escudo ou reiniciar reparacao devido a carga de modulo.
  const hp=player.hp,shield=player.shield;
  computeStats(false);
  player.hp=Math.max(0,Math.min(hp,player.maxHp));
  player.shield=Math.max(0,Math.min(shield,player.maxShield));
  progress.hp=player.hp;progress.shield=player.shield;
  updateUI();syncSharedUniversePlayer(true);
 }catch{astralCombatV431.snapshot=null;}
}
document.addEventListener('stellar-astral-loadout-updated',()=>{void refreshAstralCombatV431();});
`+anchor);
 }
 const balance="laserDamage*=1+relayGlobalBonusPct('damage')/100;";
 if(!s.includes('verifiedAstralPveBonusV431(astralCombatV431.snapshot')){
  requireText(s,balance,'public/game.js');
  s=s.replace(balance,balance+"laserDamage*=1+(astralCombatV431.owner===getUser()?.id?verifiedAstralPveBonusV431(astralCombatV431.snapshot,progress?.combatConfigsV2013?.active||1):0)/100;");
 }
 const postBoot="    gameBootstrapRuntime.ready=true;";
 if(!s.includes('gameBootstrapRuntime.ready=true;\n    void refreshAstralCombatV431();')){requireText(s,postBoot,'public/game.js');s=s.replace(postBoot,postBoot+'\n    void refreshAstralCombatV431();');}
 // Clear validated state when a different account authenticates on the same tab.
 const auth='async function afterAuth(){';
 if(!s.includes('astralCombatV431.owner=null;astralCombatV431.snapshot=null;')){
  requireText(s,auth,'public/game.js');s=s.replace(auth,auth+'\n  astralCombatV431.owner=null;astralCombatV431.snapshot=null;++astralCombatV431.request;');
 }
 requireText(s,"./api.js?v="+NEXT,'public/game.js');
 return s;
});
edit('public/modules/stage-a-v423.js',s=>{
 s=s.replaceAll('?v='+BASE,'?v='+NEXT);
 const anchor='await saveLoadoutV423(conf,slot,select.value||null);';
 if(!s.includes('stellar-astral-loadout-updated')){
  requireText(s,anchor,'public/modules/stage-a-v423.js');
  s=s.replace(anchor,anchor+"window.dispatchEvent(new Event('stellar-astral-loadout-updated'));");
 }
 return s;
});
edit('public/modules/unified-expansion-v42.js',s=>{
 s=s.replaceAll('?v='+BASE,'?v='+NEXT);
 if(!s.includes("from './astral-combat-admin-v431.js'"))s="import {renderAstralCombatAdminV431} from './astral-combat-admin-v431.js';\n"+s;
 const anchor="if(tab==='scout'||tab==='civil'||tab==='admin')void renderStageBV426(root,tab);";
 if(!s.includes('renderAstralCombatAdminV431(root,tab,snapshot.isAdmin)')){
  requireText(s,anchor,'public/modules/unified-expansion-v42.js');
  s=s.replace(anchor,anchor+"\nif(tab==='forge'||tab==='admin')void renderAstralCombatAdminV431(root,tab,snapshot.isAdmin);");
 }
 return s;
});
for(const file of ['public/modules/astral-rewards-v381.js','public/modules/stage-b-v426.js'])edit(file,s=>s.replaceAll('?v='+BASE,'?v='+NEXT));
edit('public/index.html',s=>{
 s=s.replaceAll('?v='+BASE,'?v='+NEXT);
 requireText(s,'/game.js?v='+NEXT,'public/index.html');return s;
});
edit('tests/stage-b-v426.test.mjs',s=>s.replace("assert.equal(pkg.version,'42.6.2');","assert.equal(pkg.version,JSON.parse(read('package.json')).version);"));
edit('tests/v4262-cleanup.test.mjs',s=>{
 s=s.replace("assert.equal(pkg.version,'42.6.2');","assert.equal(pkg.version,JSON.parse(read('package.json')).version);");
 s=s.replaceAll("/\\.\\.\\/api\\.js\\?v=42\\.6\\.2/","new RegExp('\\\\.\\\\./api\\\\.js\\\\?v='+pkg.version.replaceAll('.','\\\\.'))");
 return s;
});
console.log('Combat Evolution: integracoes incrementais preservadas.');
