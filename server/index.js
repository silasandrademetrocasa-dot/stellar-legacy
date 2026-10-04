import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import { attachSharedUniverse } from './world.js';

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

function normalizeSupabaseUrl(value = '') {
  let url = String(value || '').trim();
  if (!url) return '';
  url = url.replace(/\/+$/, '');
  url = url.replace(/\/rest\/v1$/i, '');
  return url;
}

const SUPABASE_URL = normalizeSupabaseUrl(process.env.SUPABASE_URL || '');
const SUPABASE_KEY = String(process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || '').trim();

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, '../public')));

function asyncRoute(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

function supabaseBase() {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  return createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function supabaseForToken(token) {
  if (!SUPABASE_URL || !SUPABASE_KEY || !token) return null;
  return createClient(SUPABASE_URL, SUPABASE_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function bearer(req) {
  const value = req.headers.authorization || '';
  return value.startsWith('Bearer ') ? value.slice(7) : '';
}

function configStatus() {
  return {
    urlConfigured: Boolean(SUPABASE_URL),
    keyConfigured: Boolean(SUPABASE_KEY),
    urlHost: SUPABASE_URL ? (() => { try { return new URL(SUPABASE_URL).host; } catch { return 'URL inválida'; } })() : null,
    keyType: SUPABASE_KEY.startsWith('sb_publishable_') ? 'publishable' : SUPABASE_KEY ? 'legacy/anon' : null,
  };
}

const LIVE_OPS_CACHE_MS = 12000;
let liveOpsCache = null;
let liveOpsCacheAt = 0;
const livePurchaseLocks = new Map();

async function loadLiveOpsSnapshot(force=false) {
  const now=Date.now();
  if(!force&&liveOpsCache&&now-liveOpsCacheAt<LIVE_OPS_CACHE_MS)return liveOpsCache;
  const sb=supabaseBase();
  if(!sb)throw new Error('Supabase indisponível para LIVE OPS.');
  const {data,error}=await sb.rpc('get_live_ops_v16');
  if(error)throw new Error(`Falha ao carregar LIVE OPS: ${error.message}`);
  liveOpsCache=(data&&typeof data==='object')?data:{events:[],catalog:[],server_time:now};
  liveOpsCacheAt=now;
  return liveOpsCache;
}

function liveCatalogRow(snapshot,key){
  return (snapshot?.catalog||[]).find(row=>row?.enabled&&String(row.catalog_key||'')===String(key||''))||null;
}
function premiumDiscountEligible(row){
  return row?.currency==='uridium'&&['ship','laser','generator','drone','extra','pet','pet_gear'].includes(String(row?.kind||''));
}
function ensurePetState(state){
  state.pet ||= {owned:false,level:1,xp:0,xpModelV101:true,laserSlotsUnlocked:0,shieldSlotsUnlocked:0,lasers:[],shields:[],gearsOwned:{guard:false,box:false,ore:false,repair:false,kami:false},activeGear:'off',kamikazeReadyAt:0};
  state.pet.gearsOwned ||= {guard:false,box:false,ore:false,repair:false,kami:false};
  state.pet.lasers ||= [];state.pet.shields ||= [];
  return state.pet;
}
function applyLiveGrant(state,row){
  const grant=row?.meta?.grant||{};
  const kind=String(grant.kind||'');
  const id=String(grant.id||row?.ref_id||'');
  const qty=Math.max(1,Math.floor(Number(grant.qty)||1));
  if(kind==='ship'){state.ownedShips ||= [];if(state.ownedShips.includes(id))throw Object.assign(new Error('Nave já obtida.'),{status:409});state.ownedShips.push(id);return;}
  if(kind==='inventory'){state.inventory ||= {};const equippedExtra=(state.shipLoadout?.extras||[]).includes(id);if(row.kind==='extra'&&((state.inventory[id]||0)>0||equippedExtra))throw Object.assign(new Error('Esse EXTRA já pertence à sua conta.'),{status:409});state.inventory[id]=(Number(state.inventory[id])||0)+qty;return;}
  if(kind==='drone'){state.drones ||= [];if(state.drones.length>=8)throw Object.assign(new Error('Limite de 8 drones atingido.'),{status:409});state.drones.push({id:`d_${Date.now()}_${randomUUID().slice(0,6)}`,type:id,slots:Array(Math.max(1,Number(grant.slots)||1)).fill(null)});return;}
  if(kind==='ammo'){state.ammo ||= {};state.ammo[id]=(Number(state.ammo[id])||0)+qty;return;}
  if(kind==='rocket'){state.rockets ||= {};state.rockets[id]=(Number(state.rockets[id])||0)+qty;return;}
  if(kind==='pet_base'){const pet=ensurePetState(state);if(pet.owned)throw Object.assign(new Error('AUX-9 já adquirido.'),{status:409});pet.owned=true;pet.level=Math.max(1,Number(pet.level)||1);pet.laserSlotsUnlocked=Math.max(1,Number(pet.laserSlotsUnlocked)||1);pet.shieldSlotsUnlocked=Math.max(1,Number(pet.shieldSlotsUnlocked)||1);pet.lasers=pet.lasers.length?pet.lasers:[null];pet.shields=pet.shields.length?pet.shields:[null];return;}
  if(kind==='pet_gear'){const pet=ensurePetState(state);if(!pet.owned)throw Object.assign(new Error('Adquira o AUX-9 primeiro.'),{status:409});if(pet.gearsOwned[id])throw Object.assign(new Error('Módulo já adquirido.'),{status:409});pet.gearsOwned[id]=true;return;}
  throw Object.assign(new Error('Produto ainda não habilitado para compra autoritativa nesta etapa.'),{status:409});
}

async function withPurchaseLock(userId,fn){
  const prev=livePurchaseLocks.get(userId)||Promise.resolve();
  let release;const current=new Promise(r=>release=r);livePurchaseLocks.set(userId,current);
  await prev.catch(()=>{});
  try{return await fn();}finally{release();if(livePurchaseLocks.get(userId)===current)livePurchaseLocks.delete(userId);}
}


const GATE_SERVER_DEFS={
  alpha:{key:'alpha',label:'AURORA',pieces:34,unlock:null},
  beta:{key:'beta',label:'NEXUS',pieces:48,unlock:'alpha'},
  gamma:{key:'gamma',label:'ECLIPSE',pieces:64,unlock:'beta'},
};
const GATE_AMMO={lcb10:{name:'PLS-1',base:300},mcb25:{name:'PLS-2',base:200},mcb50:{name:'PLS-3',base:120},ucb100:{name:'PLS-4',base:70}};
const GATE_ROCKETS={r310:{name:'R-310',base:15},plt2026:{name:'PLT-2026',base:10},plt2021:{name:'PLT-2021',base:7},plt3030:{name:'PLT-3030',base:5}};
function randomChoiceServer(list){return list[Math.floor(Math.random()*list.length)];}
function randomIntServer(min,max){return Math.floor(min+Math.random()*(max-min+1));}
function ensureGalaxyGateServer(state){
  state.galaxyGate ||= {jumpBonus:0,repairBonus:0,lastResults:[],selected:'alpha'};
  const g=state.galaxyGate;g.jumpBonus=Math.max(0,Number(g.jumpBonus)||0);g.repairBonus=Math.max(0,Number(g.repairBonus)||0);g.lastResults=Array.isArray(g.lastResults)?g.lastResults:[];
  for(const [key,def] of Object.entries(GATE_SERVER_DEFS)){
    g[key] ||= {pieces:[],built:false,lives:3,completed:0,failed:0,run:null,lastCompletion:null};
    const x=g[key];x.pieces=Array.isArray(x.pieces)?[...new Set(x.pieces.map(Number).filter(n=>n>=1&&n<=def.pieces))]:[];x.built=!!x.built||x.pieces.length>=def.pieces;x.completed=Math.max(0,Number(x.completed)||0);
  }
  return g;
}
function gateUnlockedServer(state,key){const def=GATE_SERVER_DEFS[key];if(!def)return false;if(!def.unlock)return true;const g=ensureGalaxyGateServer(state);return Number(g[def.unlock]?.completed||0)>0;}
function pilotLuckServer(state){
  const skills=state?.pilotBio?.skills||{};
  const values={luck1:[2,4],luck2:[2,4,8]};
  let total=0;for(const id of ['luck1','luck2']){const lv=Math.max(0,Math.floor(Number(skills[id])||0));if(lv)total+=Number(values[id][Math.min(lv,values[id].length)-1]||0);}return total/100;
}
function addGatePieceServer(state,key){
  const g=ensureGalaxyGateServer(state),gate=g[key],def=GATE_SERVER_DEFS[key];const missing=Array.from({length:def.pieces},(_,i)=>i+1).filter(n=>!gate.pieces.includes(n));
  if(!missing.length){gate.built=true;return null;}const piece=randomChoiceServer(missing);gate.pieces.push(piece);gate.pieces.sort((a,b)=>a-b);if(gate.pieces.length>=def.pieces)gate.built=true;return piece;
}
function rollGateOnceServer(state,key){
  const g=ensureGalaxyGateServer(state),gate=g[key],def=GATE_SERVER_DEFS[key];state.profile ||= {};state.pilotBio ||= {};state.pilotBio.logDisks=Math.max(0,Number(state.pilotBio.logDisks)||0);state.ammo ||= {};state.rockets ||= {};state.cargo ||= {};
  const luck=pilotLuckServer(state);let r=Math.random()*100;if(luck>0)r=Math.max(0,r-luck*18);if(gate.built&&r<12)r=12+Math.random()*88;
  if(r<12){const piece=addGatePieceServer(state,key);return {kind:'piece',label:`Peça ${def.label} #${piece}`,piece};}
  if(r<20){const qty=randomIntServer(1,5);state.pilotBio.logDisks+=qty;return {kind:'logdisk',label:`Núcleos Quânticos +${qty}`,qty};}
  if(r<45){const id=randomChoiceServer(Object.keys(GATE_AMMO)),qty=GATE_AMMO[id].base*randomIntServer(1,4);state.ammo[id]=(Number(state.ammo[id])||0)+qty;return {kind:'ammo',id,qty,label:`${GATE_AMMO[id].name} +${qty}`};}
  if(r<64){const id=randomChoiceServer(Object.keys(GATE_ROCKETS)),qty=GATE_ROCKETS[id].base*randomIntServer(1,4);state.rockets[id]=(Number(state.rockets[id])||0)+qty;return {kind:'rocket',id,qty,label:`${GATE_ROCKETS[id].name} +${qty}`};}
  if(r<80){const qty=randomIntServer(1500,12000);state.profile.credits=Math.max(0,Number(state.profile.credits)||0)+qty;return {kind:'credits',qty,label:`Créditos +${qty}`};}
  if(r<90){const qty=randomIntServer(4,18);state.cargo.Xenomit=(Number(state.cargo.Xenomit)||0)+qty;return {kind:'xenomit',qty,label:`Voidite +${qty}`};}
  if(r<95){g.jumpBonus++;return {kind:'jump',label:'Bônus de Salto +1'};}
  g.repairBonus++;return {kind:'repair',label:'Bônus de Reparo +1'};
}
async function readEconomySave(req){
  const {data,error}=await req.sb.from('game_saves').select('state').eq('user_id',req.user.id).maybeSingle();if(error)throw new Error(error.message);if(!data?.state)throw Object.assign(new Error('Save online ainda não foi criado.'),{status:409});const state=structuredClone(data.state);if(String(state.accountOwnerId||req.user.id)!==req.user.id)throw Object.assign(new Error('SAVE BLOQUEADO: proprietário inválido.'),{status:409});state.profile ||= {};return state;
}
async function writeEconomySave(req,state){
  state.accountOwnerId=req.user.id;state.accountOwnerEmail=req.user.email||null;state.clientSavedAt=Date.now();const updated_at=new Date().toISOString();const {error}=await req.sb.from('game_saves').upsert({user_id:req.user.id,state,updated_at},{onConflict:'user_id'});if(error)throw new Error(error.message);
  const profile=state.profile||{},securedCallsign=await ensureProfile(req.sb,req.user);await req.sb.from('profiles').upsert({id:req.user.id,callsign:securedCallsign,faction:profile.faction||null,level:Number(profile.level||1),xp:Number(profile.xp||0),credits:Number(profile.credits||0),uridium:Number(profile.uridium||0),aliens_killed:Number(profile.aliensKilled||0),gg_completed:Number(state.galaxyGate?.alpha?.completed||profile.ggCompleted||0),updated_at},{onConflict:'id'});return updated_at;
}
function debitServer(state,amount,currency){const c=currency==='uridium'?'uridium':'credits',price=Math.max(0,Math.round(Number(amount)||0)),balance=Math.max(0,Number(state.profile?.[c])||0);if(balance<price)throw Object.assign(new Error(`Saldo insuficiente: faltam ${price-balance} ${c==='uridium'?'STL':'CR'}.`),{status:409});state.profile[c]=balance-price;return {currency:c,price,balance:state.profile[c]};}
function creditServer(state,amount,currency){const c=currency==='uridium'?'uridium':'credits',value=Math.max(0,Math.round(Number(amount)||0));state.profile[c]=Math.max(0,Number(state.profile?.[c])||0)+value;return {currency:c,value,balance:state.profile[c]};}
function catalogSellRow(snapshot,itemId){return (snapshot?.catalog||[]).find(r=>r?.enabled&&String(r.ref_id||'')===String(itemId||'')&&['laser','generator','extra'].includes(String(r.kind||'')))||null;}

function gameSessionIdFromRequest(req) {
  return String(req.headers['x-game-session-id'] || '').trim();
}

function deviceLabel(req) {
  const ua = String(req.headers['user-agent'] || 'Dispositivo').replace(/\s+/g, ' ').trim();
  return ua.slice(0, 160) || 'Dispositivo';
}

async function registerGameSession(sb, req) {
  const sessionId = randomUUID();
  const { data, error } = await sb.rpc('register_game_session_v1214', {
    p_session_id: sessionId,
    p_device_label: deviceLabel(req),
  });
  if (error) throw new Error(`Falha ao registrar sessão do jogo: ${error.message}`);
  return { sessionId, replacedPrevious: Boolean(data?.replaced_previous) };
}

async function validateGameSession(sb, req, { touch = true } = {}) {
  const sessionId = gameSessionIdFromRequest(req);
  if (!sessionId) return { valid: false, missing: true, reason: 'missing' };
  const { data, error } = await sb.rpc('validate_game_session_v1214', {
    p_session_id: sessionId,
    p_touch: Boolean(touch),
  });
  if (error) throw new Error(`Falha ao validar sessão do jogo: ${error.message}`);
  return { ...(data || {}), sessionId };
}


async function requireUser(req, res, next) {
  try {
    const token = bearer(req);
    if (!token) return res.status(401).json({ error: 'Sessão ausente.' });
    const sb = supabaseBase();
    if (!sb) return res.status(503).json({ error: 'Supabase não configurado no servidor.', diagnostics: configStatus() });
    const { data, error } = await sb.auth.getUser(token);
    if (error || !data?.user) return res.status(401).json({ error: 'Sessão inválida ou expirada.' });
    req.accessToken = token;
    req.user = data.user;
    req.sb = supabaseForToken(token);
    const gameSession = await validateGameSession(req.sb, req, { touch: true });
    if (!gameSession.valid) {
      return res.status(gameSession.missing ? 401 : 409).json({
        error: gameSession.missing
          ? 'Faça login novamente para ativar a proteção de sessão única.'
          : 'Sua conta foi acessada em outro dispositivo.',
        code: gameSession.missing ? 'SESSION_REQUIRED' : 'SESSION_REPLACED',
      });
    }
    req.gameSessionId = gameSession.sessionId;
    next();
  } catch (err) {
    next(err);
  }
}

function normalizeCallsign(value = '') {
  return String(value || '').trim().replace(/\s+/g, ' ').slice(0, 24);
}

function fallbackCallsign(user) {
  const suffix = String(user?.id || randomUUID()).replace(/-/g, '').slice(0, 6).toUpperCase();
  return `Pilot-${suffix}`.slice(0, 24);
}

async function callsignAvailable(sb, callsign, excludeUserId = null) {
  const preferred = normalizeCallsign(callsign);
  if (!preferred) return false;
  // V14.1 RPC é SECURITY DEFINER e enxerga todos os perfis sem expor dados privados.
  const { data, error } = await sb.rpc('callsign_available_v141', {
    p_callsign: preferred,
    p_exclude_user: excludeUserId || null,
  });
  if (!error) return Boolean(data);
  // Compatibilidade durante a janela entre deploy e execução da migration.
  const fallback = await sb.from('profiles').select('id').ilike('callsign', preferred).limit(2);
  if (!fallback.error) return !(fallback.data || []).some(row => !excludeUserId || row.id !== excludeUserId);
  return null;
}

async function ensureProfile(sb, user, callsign = '') {
  const { data: existing, error: readError } = await sb.from('profiles').select('id,callsign').eq('id', user.id).maybeSingle();
  if (readError) throw new Error(`Falha ao carregar perfil: ${readError.message}`);
  if (existing?.callsign) return normalizeCallsign(existing.callsign);

  let preferred = normalizeCallsign(callsign || user.user_metadata?.callsign || user.email?.split('@')[0] || 'Pilot');
  if (preferred.length < 3) preferred = fallbackCallsign(user);
  const available = await callsignAvailable(sb, preferred, user.id);
  if (available === false) preferred = fallbackCallsign(user);

  const { data: created, error } = await sb.from('profiles').insert({
    id: user.id,
    callsign: preferred,
    updated_at: new Date().toISOString(),
  }).select('callsign').single();
  if (error) {
    // Em caso de corrida na reserva de nome, cria identidade técnica única para não bloquear o login.
    if (String(error.code) === '23505' || /callsign|duplicate|unique/i.test(String(error.message || ''))) {
      preferred = fallbackCallsign(user);
      const retry = await sb.from('profiles').insert({ id: user.id, callsign: preferred, updated_at: new Date().toISOString() }).select('callsign').single();
      if (retry.error) throw new Error(`Falha ao criar perfil seguro: ${retry.error.message}`);
      return normalizeCallsign(retry.data?.callsign || preferred);
    }
    throw new Error(`Falha ao criar perfil: ${error.message}`);
  }
  return normalizeCallsign(created?.callsign || preferred);
}

async function accountUser(sb, user, preferred = '') {
  const callsign = await ensureProfile(sb, user, preferred);
  return { id: user.id, email: user.email, callsign };
}

app.get('/health', (req, res) => res.json({ ok: true, game: 'Stellar Legacy', version: '16.7.4', universe: 'shared' }));


app.get('/api/config', (req, res) => {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(503).json({ error: 'Supabase não configurado no Render.', diagnostics: configStatus() });
  }
  res.json({
    supabaseUrl: SUPABASE_URL,
    supabasePublishableKey: SUPABASE_KEY,
    directBrowserMode: true,
  });
});

app.get('/api/meta', (req, res) => res.json({
  name: 'Stellar Legacy',
  version: '16.7.4',
  authReady: Boolean(SUPABASE_URL && SUPABASE_KEY),
  diagnostics: configStatus(),
  features: ['login', 'cloud_save', 'factions', 'safe_zone', 'shop', 'owned_ships', 'equipment_slots', 'inventory', 'drones', 'ammo', 'rockets', 'expanded_expedition_maps', 'cargo_hold', 'ore_trading', 'npc_cargo_boxes', 'npc_respawn', 'minimap_navigation', 'waypoints', 'landmark_discovery', 'combat_fx', 'pet_modules', 'auto_buy_cpu', 'v8_asset_identity', 'mission_control_v93', 'mission_acceptance_tracking', 'expanded_enemy_density', 'online_player_presence', 'real_player_auction', 'rank_nameplates_v12', 'clans_v12', 'clan_vault_v12', 'premium_shop_v12', 'battle_pass_paid_v12', 'premium_subscription_v12', 'clan_daily_economy_v12', 'portal_neutral_zone_v12', 'base_only_equipment_v12', 'single_session_v1214', 'manual_login_v141', 'account_bound_save_v141', 'unique_callsign_v141', 'premium_auto_combat_v141', 'shared_universe_v15', 'authoritative_npcs_v15', 'shared_ores_v15', 'shared_events_v15', 'websocket_world_v15', 'npc_contribution_v15', 'realtime_player_socket_v151', 'remote_laser_fx_v151', 'remote_aux9_v151', 'low_latency_world_v151', 'live_ops_v16', 'server_authoritative_shop_v16', 'supabase_event_schedule_v16', 'economy_guard_v161', 'server_auto_buy_v161', 'server_trader_v161', 'server_pet_slots_v161', 'server_materializer_v161', 'server_quantum_cores_v161', 'chat_dock_v162', 'drone_designers_v163', 'designer_sets_v163', 'nexus_eclipse_designer_drops_v163', 'global_chat_v162', 'clan_chat_v162', 'private_chat_v162', 'bottom_hud_reflow_v162', 'ship_designers_v165', 'aux_designers_v165', 'designer_ship_abilities_v165', 'event_designer_drops_v165', 'social_minimap_v165', 'realtime_designer_visuals_v165'],
}));

app.get('/api/diagnostics', asyncRoute(async (req, res) => {
  const base = configStatus();
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(503).json({ ok: false, ...base, error: 'Variáveis do Supabase ausentes no Render.' });
  }
  let parsed;
  try {
    parsed = new URL(SUPABASE_URL);
  } catch {
    return res.status(503).json({ ok: false, ...base, error: 'SUPABASE_URL inválida.' });
  }
  if (!parsed.hostname.endsWith('.supabase.co')) {
    return res.status(503).json({ ok: false, ...base, error: 'SUPABASE_URL não parece ser uma Project URL válida.' });
  }

  const response = await fetch(`${SUPABASE_URL}/auth/v1/settings`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    signal: AbortSignal.timeout(10000),
  });
  const text = await response.text();
  return res.status(response.ok ? 200 : 502).json({
    ok: response.ok,
    ...base,
    supabaseStatus: response.status,
    message: response.ok ? 'Render conseguiu falar com o Supabase.' : `Supabase respondeu HTTP ${response.status}.`,
    detail: response.ok ? undefined : text.slice(0, 240),
  });
}));

app.post('/api/auth/signup', asyncRoute(async (req, res) => {
  const { email, password, callsign } = req.body || {};
  if (!email || !password || !callsign) return res.status(400).json({ error: 'Informe callsign, e-mail e senha.' });
  const preferredCallsign = normalizeCallsign(callsign);
  if (preferredCallsign.length < 3) return res.status(400).json({ error: 'O callsign precisa ter pelo menos 3 caracteres.' });
  if (password.length < 6) return res.status(400).json({ error: 'A senha precisa ter pelo menos 6 caracteres.' });
  const sb = supabaseBase();
  if (!sb) return res.status(503).json({ error: 'Supabase não configurado no Render.', diagnostics: configStatus() });
  const available = await callsignAvailable(sb, preferredCallsign);
  if (available === false) return res.status(409).json({ error: 'Esse nome de piloto já está em uso. Escolha outro.', code: 'CALLSIGN_TAKEN' });

  const { data, error } = await sb.auth.signUp({
    email: String(email).trim().toLowerCase(),
    password,
    options: { data: { callsign: preferredCallsign } },
  });
  if (error) return res.status(400).json({ error: error.message });

  let gameSession = null;
  if (data.session && data.user) {
    const authed = supabaseForToken(data.session.access_token);
    const securedCallsign = await ensureProfile(authed, data.user, preferredCallsign);
    data.user.user_metadata = { ...(data.user.user_metadata || {}), callsign: securedCallsign };
    gameSession = await registerGameSession(authed, req);
  }

  res.json({
    user: data.user ? { id: data.user.id, email: data.user.email, callsign: data.user.user_metadata?.callsign || preferredCallsign } : null,
    session: data.session ? {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at,
      game_session_id: gameSession?.sessionId || null,
    } : null,
    requires_confirmation: !data.session,
  });
}));

app.post('/api/auth/login', asyncRoute(async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Informe e-mail e senha.' });
  const sb = supabaseBase();
  if (!sb) return res.status(503).json({ error: 'Supabase não configurado no Render.', diagnostics: configStatus() });
  const { data, error } = await sb.auth.signInWithPassword({ email: String(email).trim().toLowerCase(), password });
  if (error || !data.session) return res.status(401).json({ error: error?.message || 'Login inválido.' });
  const authed = supabaseForToken(data.session.access_token);
  const securedUser = await accountUser(authed, data.user);
  const gameSession = await registerGameSession(authed, req);
  res.json({
    user: securedUser,
    session: {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at,
      game_session_id: gameSession.sessionId,
    },
    replaced_previous: gameSession.replacedPrevious,
  });
}));

app.post('/api/auth/refresh', asyncRoute(async (req, res) => {
  const { refresh_token, game_session_id } = req.body || {};
  if (!refresh_token) return res.status(400).json({ error: 'Refresh token ausente.' });
  if (!game_session_id) return res.status(401).json({ error: 'Faça login novamente para ativar a proteção de sessão única.', code: 'SESSION_REQUIRED' });
  const sb = supabaseBase();
  if (!sb) return res.status(503).json({ error: 'Supabase não configurado.', diagnostics: configStatus() });
  const { data, error } = await sb.auth.refreshSession({ refresh_token });
  if (error || !data.session) return res.status(401).json({ error: error?.message || 'Não foi possível renovar a sessão.' });
  const authed = supabaseForToken(data.session.access_token);
  const { data: sessionState, error: sessionError } = await authed.rpc('validate_game_session_v1214', {
    p_session_id: String(game_session_id),
    p_touch: true,
  });
  if (sessionError) return res.status(503).json({ error: `Falha ao validar sessão do jogo: ${sessionError.message}` });
  if (!sessionState?.valid) return res.status(409).json({ error: 'Sua conta foi acessada em outro dispositivo.', code: 'SESSION_REPLACED' });
  const securedUser = await accountUser(authed, data.user);
  res.json({
    user: securedUser,
    session: {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at,
      game_session_id: String(game_session_id),
    },
  });
}));

app.get('/api/auth/session-status', requireUser, asyncRoute(async (req, res) => {
  res.json({ ok: true, active: true, game_session_id: req.gameSessionId });
}));

app.post('/api/auth/logout', requireUser, asyncRoute(async (req, res) => {
  const { data, error } = await req.sb.rpc('clear_game_session_v1214', { p_session_id: req.gameSessionId });
  if (error) return res.status(400).json({ error: error.message });
  res.json(data || { ok: true });
}));

app.get('/api/auth/me', requireUser, asyncRoute(async (req, res) => {
  const user = await accountUser(req.sb, req.user);
  res.json({ user });
}));

app.put('/api/account/callsign', requireUser, asyncRoute(async (req, res) => {
  const preferred = normalizeCallsign(req.body?.callsign);
  if (preferred.length < 3) return res.status(400).json({ error: 'O nome precisa ter pelo menos 3 caracteres.' });
  const available = await callsignAvailable(req.sb, preferred, req.user.id);
  if (available === false) return res.status(409).json({ error: 'Esse nome de piloto já está em uso. Escolha outro.', code: 'CALLSIGN_TAKEN' });

  const { error: profileError } = await req.sb.from('profiles').update({
    callsign: preferred,
    updated_at: new Date().toISOString(),
  }).eq('id', req.user.id);
  if (profileError) {
    if (String(profileError.code) === '23505' || /callsign|duplicate|unique/i.test(String(profileError.message || ''))) {
      return res.status(409).json({ error: 'Esse nome de piloto já está em uso. Escolha outro.', code: 'CALLSIGN_TAKEN' });
    }
    return res.status(400).json({ error: profileError.message });
  }

  // Mantém o metadata sincronizado, mas o perfil é a fonte de verdade da identidade pública.
  const { error: authError } = await req.sb.auth.updateUser({ data: { callsign: preferred } });
  if (authError) console.warn('callsign auth metadata:', authError.message);
  res.json({ user: { id: req.user.id, email: req.user.email, callsign: preferred } });
}));

app.get('/api/live-ops', requireUser, asyncRoute(async (req,res)=>{
  const data=await loadLiveOpsSnapshot(Boolean(req.query?.refresh));
  res.json(data);
}));

app.post('/api/live/purchase', requireUser, asyncRoute(async (req,res)=>{
  const catalogKey=String(req.body?.catalog_key||'').trim().slice(0,120);
  if(!catalogKey)return res.status(400).json({error:'Produto inválido.'});
  const result=await withPurchaseLock(req.user.id,async()=>{
    const snapshot=await loadLiveOpsSnapshot(true);
    const row=liveCatalogRow(snapshot,catalogKey);
    if(!row)throw Object.assign(new Error('Produto indisponível no catálogo online.'),{status:404});
    const {data:saveRow,error:saveError}=await req.sb.from('game_saves').select('state').eq('user_id',req.user.id).maybeSingle();
    if(saveError)throw new Error(saveError.message);
    if(!saveRow?.state)throw Object.assign(new Error('Save online ainda não foi criado.'),{status:409});
    const state=structuredClone(saveRow.state);
    if(String(state.accountOwnerId||req.user.id)!==req.user.id)throw Object.assign(new Error('SAVE BLOQUEADO: proprietário inválido.'),{status:409});
    state.profile ||= {};
    const {data:premiumState}=await req.sb.rpc('get_premium_shop_v12');
    const premium=!!premiumState?.premium_active;
    const basePrice=Math.max(0,Math.round(Number(row.price)||0));
    const price=premium&&premiumDiscountEligible(row)?Math.max(1,Math.floor(basePrice*.95)):basePrice;
    const currency=String(row.currency||'credits')==='uridium'?'uridium':'credits';
    const balance=Math.max(0,Number(state.profile[currency])||0);
    if(balance<price)throw Object.assign(new Error(`Saldo insuficiente para ${catalogKey}.`),{status:409});
    applyLiveGrant(state,row);
    state.profile[currency]=balance-price;
    state.clientSavedAt=Date.now();
    state.accountOwnerId=req.user.id;state.accountOwnerEmail=req.user.email||null;
    const updated_at=new Date().toISOString();
    const {error:writeError}=await req.sb.from('game_saves').upsert({user_id:req.user.id,state,updated_at},{onConflict:'user_id'});
    if(writeError)throw new Error(writeError.message);
    const profile=state.profile||{};
    const securedCallsign=await ensureProfile(req.sb,req.user);
    await req.sb.from('profiles').upsert({id:req.user.id,callsign:securedCallsign,faction:profile.faction||null,level:Number(profile.level||1),xp:Number(profile.xp||0),credits:Number(profile.credits||0),uridium:Number(profile.uridium||0),aliens_killed:Number(profile.aliensKilled||0),gg_completed:Number(state.galaxyGate?.alpha?.completed||profile.ggCompleted||0),updated_at},{onConflict:'id'});
    return {state,updated_at,purchase:{catalog_key:catalogKey,base_price:basePrice,price,currency,premium_discount:price<basePrice}};
  });
  res.json({ok:true,...result});
}));



app.post('/api/economy/action', requireUser, asyncRoute(async (req,res)=>{
  const action=String(req.body?.action||'').trim();
  const payload=(req.body?.payload&&typeof req.body.payload==='object')?req.body.payload:{};
  if(!action)return res.status(400).json({error:'Ação econômica ausente.'});
  const result=await withPurchaseLock(req.user.id,async()=>{
    const snapshot=await loadLiveOpsSnapshot(true);
    const state=await readEconomySave(req);
    const {data:premiumState}=await req.sb.rpc('get_premium_shop_v12');
    const premium=!!premiumState?.premium_active;
    let info={action};

    if(action==='auto_buy'){
      const extras=Array.isArray(state?.shipLoadout?.extras)?state.shipLoadout.extras:[];if(!extras.includes('ammoAutoBuyCpu'))throw Object.assign(new Error('CPU AUTO BUY não está equipado no save online.'),{status:403});
      const key=String(payload.catalog_key||'').slice(0,120),row=liveCatalogRow(snapshot,key);
      if(!row||!['ammo','rocket'].includes(String(row.kind||'')))throw Object.assign(new Error('AUTO BUY indisponível para esse produto.'),{status:404});
      const base=Math.max(0,Math.round(Number(row.price)||0)),price=premium&&premiumDiscountEligible(row)?Math.max(1,Math.floor(base*.95)):base,currency=String(row.currency||'credits')==='uridium'?'uridium':'credits';
      const before=currency==='uridium'?Number(state.profile.uridium||0):Number(state.profile.credits||0);debitServer(state,price,currency);const grant=row?.meta?.grant||{},id=String(grant.id||row.ref_id||''),qty=Math.max(1,Math.floor(Number(grant.qty)||1));applyLiveGrant(state,row);
      info={action,catalog_key:key,kind:String(row.kind),id,qty,price,currency,balance_before:before,balance_after:Number(state.profile[currency]||0)};
    }
    else if(action==='unlock_pet_slot'){
      const kind=String(payload.kind)==='shield'?'shield':'laser',pet=ensurePetState(state);if(!pet.owned)throw Object.assign(new Error('Adquira o AUX-9 primeiro.'),{status:409});
      const key=kind==='laser'?'laserSlotsUnlocked':'shieldSlotsUnlocked',listKey=kind==='laser'?'lasers':'shields',current=Math.max(1,Number(pet[key])||1),next=current+1,level=Math.max(1,Number(pet.level)||1);if(next>15)throw Object.assign(new Error('Limite de 15 slots atingido.'),{status:409});if(next>level)throw Object.assign(new Error(`AUX-9 precisa estar no nível ${next}.`),{status:409});
      const row=liveCatalogRow(snapshot,`pet_slot:${next}`);if(!row)throw Object.assign(new Error('Preço do slot não está publicado no LIVE OPS.'),{status:404});const cost=Math.max(0,Math.round(Number(row.price)||0));debitServer(state,cost,'uridium');pet[key]=next;pet[listKey]=Array.isArray(pet[listKey])?pet[listKey]:[];while(pet[listKey].length<next)pet[listKey].push(null);info={action,kind,slot:next,cost,currency:'uridium'};
    }
    else if(action==='buy_quantum_cores'){
      const qty=Math.max(1,Math.min(500,Math.floor(Number(payload.qty)||1))),row=liveCatalogRow(snapshot,'quantum_core:unit');if(!row)throw Object.assign(new Error('Núcleos Quânticos indisponíveis no LIVE OPS.'),{status:404});const unit=Math.max(0,Math.round(Number(row.price)||0)),cost=unit*qty;debitServer(state,cost,'uridium');state.pilotBio ||= {};state.pilotBio.logDisks=Math.max(0,Number(state.pilotBio.logDisks)||0)+qty;info={action,qty,unit_price:unit,cost,currency:'uridium'};
    }
    else if(action==='convert_pilot_point'){
      state.pilotBio ||= {};const p=state.pilotBio;p.logDisks=Math.max(0,Math.floor(Number(p.logDisks)||0));p.totalPoints=Math.max(0,Math.floor(Number(p.totalPoints)||0));if(p.totalPoints>=50)throw Object.assign(new Error('Limite de 50 Pontos de Pesquisa atingido.'),{status:409});const next=p.totalPoints+1,cost=Math.max(30,Math.round(30*Math.pow(1.1,Math.max(0,next-1))));if(p.logDisks<cost)throw Object.assign(new Error(`Faltam ${cost-p.logDisks} Núcleos Quânticos.`),{status:409});p.logDisks-=cost;p.totalPoints=next;info={action,point:next,cost,remaining_cores:p.logDisks};
    }
    else if(action==='sell_cargo'){
      const id=String(payload.resource_id||'all'),mapOk=String(state.mapId||'')==='x1'&&String(state.territoryFaction||state.profile?.faction||'')===String(state.profile?.faction||'');if(!mapOk)throw Object.assign(new Error('Trader disponível somente na sua base X-1.'),{status:409});state.cargo ||= {};let total=0;const sold={};const ids=id==='all'?Object.keys(state.cargo):[id];
      for(const rid of ids){const qty=Math.max(0,Math.floor(Number(state.cargo[rid])||0));if(!qty||rid==='Xenomit')continue;const row=liveCatalogRow(snapshot,`resource:${rid}`);if(!row||String(row?.meta?.mode||'sell')!=='sell')continue;const unit=Math.max(0,Math.round(Number(row.price)||0));if(!unit)continue;total+=qty*unit;sold[rid]={qty,unit,total:qty*unit};delete state.cargo[rid];}
      if(total<=0)throw Object.assign(new Error('Nada vendável no porão.'),{status:409});creditServer(state,total,'credits');info={action,sold,total,currency:'credits'};
    }
    else if(action==='sell_inventory'){
      const itemId=String(payload.item_id||''),qty=Math.max(1,Math.min(999,Math.floor(Number(payload.qty)||1)));state.inventory ||= {};const have=Math.max(0,Math.floor(Number(state.inventory[itemId])||0));if(!itemId||have<qty)throw Object.assign(new Error('Item não disponível no inventário online.'),{status:409});const row=catalogSellRow(snapshot,itemId);if(!row)throw Object.assign(new Error('Esse item não possui preço online para venda.'),{status:404});const unit=Math.max(1,Math.floor((Number(row.price)||0)*.5)),total=unit*qty,currency=String(row.currency)==='uridium'?'uridium':'credits';state.inventory[itemId]=have-qty;if(state.inventory[itemId]<=0)delete state.inventory[itemId];creditServer(state,total,currency);info={action,item_id:itemId,qty,unit,total,currency};
    }
    else if(action==='sell_drone'){
      const droneId=String(payload.drone_id||''),drones=Array.isArray(state.drones)?state.drones:[],idx=drones.findIndex(d=>String(d?.id||'')===droneId);if(idx<0)throw Object.assign(new Error('Drone não encontrado no save online.'),{status:404});const drone=drones[idx],row=liveCatalogRow(snapshot,`drone:${String(drone.type||'')}`);if(!row)throw Object.assign(new Error('Drone sem preço online para venda.'),{status:404});state.inventory ||= {};for(const itemId of (Array.isArray(drone.slots)?drone.slots:[]).filter(Boolean))state.inventory[itemId]=(Number(state.inventory[itemId])||0)+1;drones.splice(idx,1);state.drones=drones;const refund=Math.max(1,Math.floor((Number(row.price)||0)*.5)),currency=String(row.currency)==='uridium'?'uridium':'credits';creditServer(state,refund,currency);info={action,drone_id:droneId,drone_type:String(drone.type||''),refund,currency};
    }
    else if(action==='gate_spin'){
      const key=String(payload.protocol||'alpha'),amount=Math.max(1,Math.min(100,Math.floor(Number(payload.amount)||1)));if(!GATE_SERVER_DEFS[key]||![1,5,10,50,100].includes(amount))throw Object.assign(new Error('Sorteio de portal inválido.'),{status:400});if(!gateUnlockedServer(state,key))throw Object.assign(new Error(`${GATE_SERVER_DEFS[key].label} ainda está bloqueado.`),{status:409});const row=liveCatalogRow(snapshot,`gate_spin:${key}`);if(!row)throw Object.assign(new Error('Materializador sem preço publicado no LIVE OPS.'),{status:404});const baseUnit=Math.max(0,Math.round(Number(row.price)||0)),unit=premium?Math.max(1,Math.floor(baseUnit*.90)):baseUnit,cost=unit*amount;debitServer(state,cost,'uridium');const results=[];for(let i=0;i<amount;i++)results.push(rollGateOnceServer(state,key));state.galaxyGate.lastResults=results.slice(-12);info={action,protocol:key,amount,base_unit_price:baseUnit,unit_price:unit,cost,currency:'uridium',results,premium_discount:unit<baseUnit};
    }
    else throw Object.assign(new Error('Ação econômica não reconhecida pelo servidor.'),{status:400});

    const updated_at=await writeEconomySave(req,state);return {state,updated_at,info};
  });
  res.json({ok:true,...result});
}));

app.get('/api/save', requireUser, asyncRoute(async (req, res) => {
  const { data, error } = await req.sb.from('game_saves').select('state,updated_at').eq('user_id', req.user.id).maybeSingle();
  if (error) return res.status(400).json({ error: error.message });
  res.json({ state: data?.state || null, updated_at: data?.updated_at || null });
}));

app.put('/api/save', requireUser, asyncRoute(async (req, res) => {
  let state = req.body?.state;
  if (!state || typeof state !== 'object') return res.status(400).json({ error: 'Save inválido.' });
  const claimedOwner = String(state.accountOwnerId || '');
  if (claimedOwner && claimedOwner !== req.user.id) {
    return res.status(409).json({ error: 'SAVE BLOQUEADO: os dados pertencem a outra conta.', code: 'SAVE_OWNER_MISMATCH' });
  }
  const securedCallsign = await ensureProfile(req.sb, req.user);
  state = {
    ...state,
    accountOwnerId: req.user.id,
    accountOwnerEmail: req.user.email || null,
    profile: { ...(state.profile || {}), callsign: securedCallsign },
  };

  // V12: a coleta diária do clã é autoridade do servidor. Se um navegador ficou
  // aberto durante o reset, ele não pode sobrescrever a cobrança com um save antigo.
  let statePatch = null;
  const { data: serverSave } = await req.sb.from('game_saves').select('state').eq('user_id', req.user.id).maybeSingle();
  const serverEconomy = serverSave?.state?.serverEconomy || {};
  const clientEconomy = state?.serverEconomy || {};
  const serverCollectionDate = String(serverEconomy.lastClanCollectionDate || '');
  const clientCollectionDate = String(clientEconomy.lastClanCollectionDate || '');
  if (serverCollectionDate && serverCollectionDate > clientCollectionDate) {
    const authoritativeCredits = Number(serverSave?.state?.profile?.credits ?? state?.profile?.credits ?? 0);
    state = {
      ...state,
      profile: { ...(state.profile || {}), credits: authoritativeCredits },
      serverEconomy: { ...clientEconomy, ...serverEconomy },
    };
    statePatch = { credits: authoritativeCredits, serverEconomy: state.serverEconomy };
  }

  const updated_at = new Date().toISOString();
  const { error } = await req.sb.from('game_saves').upsert({ user_id: req.user.id, state, updated_at }, { onConflict: 'user_id' });
  if (error) return res.status(400).json({ error: error.message });

  const profile = state.profile || {};
  await req.sb.from('profiles').upsert({
    id: req.user.id,
    callsign: securedCallsign,
    faction: profile.faction || null,
    level: Number(profile.level || 1),
    xp: Number(profile.xp || 0),
    credits: Number(profile.credits || 0),
    uridium: Number(profile.uridium || 0),
    aliens_killed: Number(profile.aliensKilled || 0),
    gg_completed: Number(state.galaxyGate?.alpha?.completed || profile.ggCompleted || 0),
    updated_at,
  }, { onConflict: 'id' });

  res.json({ ok: true, updated_at, statePatch });
}));

app.get('/api/world/status', (req, res) => res.json({ ok: true, version: '16.7.4', ...sharedUniverse.stats() }));

app.get('*', (req, res) => res.sendFile(path.join(__dirname, '../public/index.html')));

app.use((err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.path}`, err);
  if (res.headersSent) return next(err);
  const explicitStatus=Number(err?.status)||0;
  const isFetchError = /fetch failed|ENOTFOUND|ECONNREFUSED|ETIMEDOUT|UND_ERR/i.test(String(err?.message || err));
  const message = explicitStatus
    ? String(err?.message||'Operação recusada.')
    : isFetchError
      ? 'Falha ao conectar ao Supabase. Confira SUPABASE_URL e a Publishable Key no Render.'
      : 'Erro interno no servidor.';
  res.status(explicitStatus||502).json({
    error: message,
    detail: String(err?.message || err).slice(0, 240),
    diagnostics: configStatus(),
  });
});

const port = process.env.PORT || 3000;
const server = http.createServer(app);
const sharedUniverse = attachSharedUniverse(server, {
  loadLiveOps: async()=>loadLiveOpsSnapshot(false),
  authenticate: async (token, gameSessionId) => {
    if (!token || !gameSessionId) throw new Error('Sessão do universo ausente.');
    const base = supabaseBase();
    if (!base) throw new Error('Supabase indisponível.');
    const { data, error } = await base.auth.getUser(token);
    if (error || !data?.user) throw new Error('Sessão inválida.');
    const sb = supabaseForToken(token);
    const { data: sessionState, error: sessionError } = await sb.rpc('validate_game_session_v1214', {
      p_session_id: gameSessionId,
      p_touch: true,
    });
    if (sessionError || !sessionState?.valid) throw new Error('Sessão do jogo substituída.');
    const callsign = await ensureProfile(sb, data.user);
    return { user: data.user, callsign };
  },
});

server.listen(port, () => {
  console.log(`Stellar Legacy V16.5.0 :${port}`);
  console.log('Supabase config:', configStatus());
  console.log('Shared Universe: ONLINE');
});
