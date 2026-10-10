import express from 'express';
import compression from 'compression';
import http from 'http';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';
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

const PUBLIC_DIR = path.join(__dirname, '../public');
const ASSET_CACHE_MS = 24 * 60 * 60 * 1000;

// V18.1.8 • HTTP BANDWIDTH OPTIMIZATION
// JS/CSS/JSON textuais são comprimidos; imagens já compactadas (PNG/WebP) passam sem custo extra.
app.use(compression({ threshold: 1024 }));
app.use(express.json({ limit: '1mb' }));

// Assets recebem cache longo. As URLs dos assets já carregam ?asset=<versão>, portanto um novo
// release invalida o cache sem obrigar o jogador a baixar os mesmos arquivos a cada F5.
app.use('/assets', express.static(path.join(PUBLIC_DIR, 'assets'), {
  maxAge: ASSET_CACHE_MS,
  etag: true,
  lastModified: true,
  setHeaders(res){res.setHeader('Cache-Control','public, max-age=86400, stale-while-revalidate=604800');}
}));
app.use(express.static(PUBLIC_DIR, {
  etag: true,
  lastModified: true,
  setHeaders(res, filePath) {
    if (/\.html?$/i.test(filePath)) res.setHeader('Cache-Control', 'no-cache');
    else if (/\.(?:js|css)$/i.test(filePath)) res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
  }
}));

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
const NPC_CONFIG_CACHE_MS = 15000;
let npcRuntimeCache = null;
let npcRuntimeCacheAt = 0;

// V18.1.3 — SERVER RUNTIME TOPBAR CACHE
// O Render busca a configuração no Supabase e materializa um snapshot temporário.
// O navegador nunca reorganiza nós por reparenting; apenas lê este snapshot validado.
const TOPBAR_RUNTIME_CACHE_MS = 15000;
const TOPBAR_RUNTIME_DIR = path.join(os.tmpdir(), 'stellar-legacy-runtime');
const TOPBAR_RUNTIME_FILE = path.join(TOPBAR_RUNTIME_DIR, 'topbar.runtime.json');
const NPC_RUNTIME_FILE = path.join(TOPBAR_RUNTIME_DIR, 'npcs.runtime.json');
const TOPBAR_ALLOWED_MODULES = new Set([
  'pilot_menu','hangar','ship','pilot_research','pet',
  'missions_menu','missions','pass',
  'battle_menu','arena','warfront','gates','events','battle_group',
  'clan','map','auction','shops_menu','shop','premium','admin','config'
]);
const TOPBAR_ALLOWED_FLAGS = new Set([
  'missions','battle_pass','arena','warfront','battle_groups','clans','auction',
  'premium_shop','crafting','economy_services','live_events'
]);
let topbarRuntimeCache = null;
let topbarRuntimeCacheAt = 0;

// V18.1.4 — WORLD RUNTIME CACHE
const WORLD_RUNTIME_CACHE_MS = 15000;
const WORLD_RUNTIME_FILE = path.join(TOPBAR_RUNTIME_DIR, 'world.runtime.json');
let worldRuntimeCache = null;
let worldRuntimeCacheAt = 0;


// V18.1.5 — MISSÕES + ECONOMIA + CRAFTING RUNTIME CACHE
const SYSTEMS_RUNTIME_CACHE_MS = 15000;
const SYSTEMS_RUNTIME_FILE = path.join(TOPBAR_RUNTIME_DIR, 'systems.runtime.json');
let systemsRuntimeCache = null;
let systemsRuntimeCacheAt = 0;

// V18.1.7B — BATTLE PASS RUNTIME CACHE
const PASS_RUNTIME_CACHE_MS = 15000;
const PASS_RUNTIME_FILE = path.join(TOPBAR_RUNTIME_DIR, 'pass.runtime.json');
let passRuntimeCache = null;
let passRuntimeCacheAt = 0;

// V18.1.7C — LOJAS COMUM + PREMIUM RUNTIME CACHE
const SHOPS_RUNTIME_CACHE_MS = 15000;
const SHOPS_RUNTIME_FILE = path.join(TOPBAR_RUNTIME_DIR, 'shops.runtime.json');
let shopsRuntimeCache = null;
let shopsRuntimeCacheAt = 0;
const COMMON_SHOP_KINDS = new Set(['ship','laser','generator','drone','pet','pet_gear','extra','ammo','rocket']);
const COMMON_SHOP_TABS = new Set(['ships','lasers','generators','drones','pet','extras','ammo','rockets']);
const SYSTEM_MISSION_CATEGORIES = new Set(['daily','weekly','monthly','special']);
const SYSTEM_SERVICE_IDS = new Set(['weapon','shield','cargo','thruster']);
const SYSTEM_EFFECT_KEYS = new Set(['laser_damage_pct','shield_pct','cargo_flat','speed_flat']);
const SYSTEM_GRANT_KINDS = new Set(['resource','ammo','rocket','repair']);
function safeJsonNumberObject(obj,maxKeys=32,maxValue=1000000000){
  const out={};if(!obj||typeof obj!=='object'||Array.isArray(obj))return out;
  for(const [k,v] of Object.entries(obj).slice(0,maxKeys)){const id=safeWorldId(k),n=Math.max(0,Math.min(maxValue,Math.floor(Number(v)||0)));if(id&&n>0)out[id]=n;}return out;
}
function sanitizeMissionTask(task){
  if(!task||typeof task!=='object')return null;const type=String(task.type||'');const id=String(task.id||'').slice(0,80);const target=Math.max(1,Math.min(1000000,Math.floor(Number(task.target)||1)));
  if(type==='kill'){const npc=safeWorldId(task.npc);return npc?{id:id||`kill_${npc}_${target}`,type,npc,target}:null;}
  if(type==='ore'){const resource=safeWorldId(task.resource);return resource?{id:id||`ore_${resource}_${target}`,type,resource,target}:null;}
  return null;
}
function sanitizeSystemsRuntime(raw){
  const mission_categories=Array.isArray(raw?.mission_categories)?raw.mission_categories.map(x=>({
    category:String(x?.category||''),label:String(x?.label||'').slice(0,48),accent:String(x?.accent||'#58d9ff').slice(0,24),reset_kind:String(x?.reset_kind||'').slice(0,16),
    min_level:Math.round(clampNum(x?.min_level,1,100,1)),reward_factor:clampNum(x?.reward_factor,0,10,1),item_chance:clampNum(x?.item_chance,0,1,0),enabled:x?.enabled!==false,
    config:x?.config&&typeof x.config==='object'&&!Array.isArray(x.config)?x.config:{}
  })).filter(x=>SYSTEM_MISSION_CATEGORIES.has(x.category)):[];
  const custom_missions=Array.isArray(raw?.custom_missions)?raw.custom_missions.map(x=>({
    mission_id:String(x?.mission_id||'').slice(0,80),category:String(x?.category||''),title:String(x?.title||'').slice(0,100),description:String(x?.description||'').slice(0,260),
    tasks:Array.isArray(x?.tasks)?x.tasks.map(sanitizeMissionTask).filter(Boolean).slice(0,8):[],group_key:String(x?.group_key||'mix').slice(0,24),sequence:!!x?.sequence,
    reward_factor:x?.reward_factor==null?null:clampNum(x.reward_factor,0,10,1),tag:x?.tag==null?null:String(x.tag).slice(0,64),
    flat_reward:x?.flat_reward&&typeof x.flat_reward==='object'&&!Array.isArray(x.flat_reward)?x.flat_reward:null,enabled:x?.enabled!==false,sort_order:Math.round(clampNum(x?.sort_order,0,9999,100))
  })).filter(x=>x.mission_id&&SYSTEM_MISSION_CATEGORIES.has(x.category)&&x.tasks.length):[];
  const economy_services=Array.isArray(raw?.economy_services)?raw.economy_services.map(x=>{
    const effect={};if(x?.effect&&typeof x.effect==='object'&&!Array.isArray(x.effect)){for(const [k,v] of Object.entries(x.effect)){if(SYSTEM_EFFECT_KEYS.has(k))effect[k]=clampNum(v,-100000,100000,0);}}
    return {service_id:String(x?.service_id||''),name:String(x?.name||'').slice(0,80),description:String(x?.description||'').slice(0,180),base_cost:Math.max(0,Math.round(Number(x?.base_cost)||0)),duration_ms:Math.round(clampNum(x?.duration_ms,60000,86400000,3600000)),level_band_size:Math.round(clampNum(x?.level_band_size,1,100,5)),level_cost_scale:clampNum(x?.level_cost_scale,0,10,.35),max_stack_ms:Math.round(clampNum(x?.max_stack_ms,60000,604800000,21600000)),effect,enabled:x?.enabled!==false,sort_order:Math.round(clampNum(x?.sort_order,0,9999,100))};
  }).filter(x=>SYSTEM_SERVICE_IDS.has(x.service_id)):[];
  const crafting_recipes=Array.isArray(raw?.crafting_recipes)?raw.crafting_recipes.map(x=>{
    const g=x?.grant_payload&&typeof x.grant_payload==='object'?x.grant_payload:{};const kind=String(g.kind||'');const grant=SYSTEM_GRANT_KINDS.has(kind)?{kind,id:g.id?safeWorldId(g.id):undefined,qty:Math.max(1,Math.min(10000000,Math.floor(Number(g.qty)||1)))}:{};
    return {recipe_id:String(x?.recipe_id||'').slice(0,64),name:String(x?.name||'').slice(0,80),description:String(x?.description||'').slice(0,180),cost:Math.max(0,Math.round(Number(x?.cost)||0)),currency:String(x?.currency)==='uridium'?'uridium':'credits',ingredients:safeJsonNumberObject(x?.ingredients),grant_payload:grant,output_label:String(x?.output_label||'').slice(0,80),min_level:Math.round(clampNum(x?.min_level,1,100,1)),enabled:x?.enabled!==false,sort_order:Math.round(clampNum(x?.sort_order,0,9999,100))};
  }).filter(x=>x.recipe_id&&x.name&&x.grant_payload.kind):[];
  return {version:Math.max(0,Number(raw?.version)||0),updated_at:raw?.updated_at||null,mission_categories,custom_missions,economy_services,crafting_recipes,generated_at:new Date().toISOString(),source:'render-temp-json'};
}
async function writeSystemsRuntimeFile(payload){await fs.mkdir(TOPBAR_RUNTIME_DIR,{recursive:true});const tmp=`${SYSTEMS_RUNTIME_FILE}.${process.pid}.tmp`;await fs.writeFile(tmp,JSON.stringify(payload),{encoding:'utf8'});await fs.rename(tmp,SYSTEMS_RUNTIME_FILE);}
async function readSystemsRuntimeFile(){try{const text=await fs.readFile(SYSTEMS_RUNTIME_FILE,'utf8');const parsed=JSON.parse(text);return parsed&&Array.isArray(parsed.economy_services)?parsed:null;}catch{return null;}}
async function refreshSystemsRuntimeSnapshot(force=false){
  const now=Date.now();if(!force&&systemsRuntimeCache&&now-systemsRuntimeCacheAt<SYSTEMS_RUNTIME_CACHE_MS)return systemsRuntimeCache;
  const sb=supabaseBase();if(!sb)throw new Error('Supabase indisponível para configuração de sistemas.');const {data,error}=await sb.rpc('get_systems_runtime_config_v1815');if(error)throw new Error(`Falha ao carregar systems runtime: ${error.message}`);
  const payload=sanitizeSystemsRuntime(data||{});if(!payload.mission_categories.length||!payload.economy_services.length||!payload.crafting_recipes.length)throw new Error('Snapshot de sistemas veio incompleto.');
  await writeSystemsRuntimeFile(payload);systemsRuntimeCache=payload;systemsRuntimeCacheAt=now;return payload;
}
async function loadSystemsRuntimeSnapshot(force=false){try{return await refreshSystemsRuntimeSnapshot(force);}catch(err){const disk=await readSystemsRuntimeFile();if(disk){systemsRuntimeCache=disk;systemsRuntimeCacheAt=Date.now();return disk;}throw err;}}


function sanitizePassReward(raw){
  const src=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};
  const cleanIds=(arr,max=12)=>Array.isArray(arr)?arr.map(safeWorldId).filter(Boolean).slice(0,max):[];
  return {
    credits:Math.max(0,Math.min(1000000000000,Math.floor(Number(src.credits)||0))),
    uridium:Math.max(0,Math.min(1000000000,Math.floor(Number(src.uridium)||0))),
    ammo:safeJsonNumberObject(src.ammo,24,100000000),
    rockets:safeJsonNumberObject(src.rockets,24,100000000),
    items:cleanIds(src.items,12),
    ships:cleanIds(src.ships,8),
    repairBonus:Math.max(0,Math.min(10000,Math.floor(Number(src.repairBonus)||0)))
  };
}
function sanitizePassRuntime(raw){
  const seasons=Array.isArray(raw?.seasons)?raw.seasons.map(x=>({
    season_key:String(x?.season_key||'').slice(0,32),
    name:String(x?.name||'').slice(0,80),
    description:String(x?.description||'').slice(0,240),
    starts_at:x?.starts_at||null,ends_at:x?.ends_at||null,
    tier_count:Math.round(clampNum(x?.tier_count,1,100,30)),
    points_per_tier:Math.round(clampNum(x?.points_per_tier,1,1000000,500)),
    daily_points:Math.round(clampNum(x?.daily_points,1,100000,100)),
    premium_price_brl:clampNum(x?.premium_price_brl,0,99999,19.9),
    enabled:x?.enabled!==false,updated_at:x?.updated_at||null
  })).filter(x=>x.season_key):[];
  let active=null;
  if(raw?.active_season&&typeof raw.active_season==='object'){
    const x=raw.active_season;active={season_key:String(x?.season_key||'').slice(0,32),name:String(x?.name||'').slice(0,80),description:String(x?.description||'').slice(0,240),starts_at:x?.starts_at||null,ends_at:x?.ends_at||null,tier_count:Math.round(clampNum(x?.tier_count,1,100,30)),points_per_tier:Math.round(clampNum(x?.points_per_tier,1,1000000,500)),daily_points:Math.round(clampNum(x?.daily_points,1,100000,100)),premium_price_brl:clampNum(x?.premium_price_brl,0,99999,19.9),enabled:x?.enabled!==false};if(!active.season_key)active=null;
  }
  const maxTier=active?.tier_count||100;
  const tiers=Array.isArray(raw?.tiers)?raw.tiers.map(x=>({season_key:String(x?.season_key||active?.season_key||'').slice(0,32),tier_no:Math.round(clampNum(x?.tier_no,1,100,1)),free_reward:sanitizePassReward(x?.free_reward),premium_reward:sanitizePassReward(x?.premium_reward),enabled:x?.enabled!==false})).filter(x=>x.season_key&&x.tier_no<=maxTier):[];
  return {version:Math.max(0,Number(raw?.version)||0),updated_at:raw?.updated_at||null,active_season:active,seasons,tiers,generated_at:new Date().toISOString(),source:'render-temp-json'};
}
async function writePassRuntimeFile(payload){await fs.mkdir(TOPBAR_RUNTIME_DIR,{recursive:true});const tmp=`${PASS_RUNTIME_FILE}.${process.pid}.tmp`;await fs.writeFile(tmp,JSON.stringify(payload),{encoding:'utf8'});await fs.rename(tmp,PASS_RUNTIME_FILE);}
async function readPassRuntimeFile(){try{const text=await fs.readFile(PASS_RUNTIME_FILE,'utf8');const parsed=JSON.parse(text);return parsed&&Array.isArray(parsed.seasons)&&Array.isArray(parsed.tiers)?parsed:null;}catch{return null;}}
async function refreshPassRuntimeSnapshot(force=false){
  const now=Date.now();if(!force&&passRuntimeCache&&now-passRuntimeCacheAt<PASS_RUNTIME_CACHE_MS)return passRuntimeCache;
  const sb=supabaseBase();if(!sb)throw new Error('Supabase indisponível para configuração do Passe.');const {data,error}=await sb.rpc('get_battle_pass_runtime_config_v1817b');if(error)throw new Error(`Falha ao carregar pass runtime: ${error.message}`);
  const payload=sanitizePassRuntime(data||{});if(!payload.seasons.length)throw new Error('Snapshot do Passe veio sem temporadas.');await writePassRuntimeFile(payload);passRuntimeCache=payload;passRuntimeCacheAt=now;return payload;
}
async function loadPassRuntimeSnapshot(force=false){try{return await refreshPassRuntimeSnapshot(force);}catch(err){const disk=await readPassRuntimeFile();if(disk){passRuntimeCache=disk;passRuntimeCacheAt=Date.now();return disk;}throw err;}}

function sanitizeCommonShopMeta(raw){
  const src=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};const g=src.grant&&typeof src.grant==='object'&&!Array.isArray(src.grant)?src.grant:{};
  const grant={};if(g.kind)grant.kind=String(g.kind).slice(0,32);if(g.id)grant.id=String(g.id).slice(0,64);if(g.protocol)grant.protocol=String(g.protocol).slice(0,32);
  if(g.qty!=null)grant.qty=Math.max(1,Math.min(10000000,Math.floor(Number(g.qty)||1)));if(g.slots!=null)grant.slots=Math.max(1,Math.min(32,Math.floor(Number(g.slots)||1)));
  return {grant};
}
function sanitizeShopsRuntime(raw){
  const common=Array.isArray(raw?.common)?raw.common.map(x=>({
    catalog_key:String(x?.catalog_key||'').slice(0,120),kind:String(x?.kind||'').slice(0,24),ref_id:String(x?.ref_id||'').slice(0,64),
    display_name:x?.display_name==null?null:String(x.display_name).slice(0,100),description:x?.description==null?null:String(x.description).slice(0,300),
    price:Math.max(0,Math.min(1000000000000,Math.round(Number(x?.price)||0))),currency:String(x?.currency)==='uridium'?'uridium':'credits',
    enabled:x?.enabled!==false,shop_tab:COMMON_SHOP_TABS.has(String(x?.shop_tab||''))?String(x.shop_tab):null,shop_visible:x?.shop_visible!==false,
    min_level:Math.round(clampNum(x?.min_level,1,100,1)),sort_order:Math.round(clampNum(x?.sort_order,0,9999,100)),meta:sanitizeCommonShopMeta(x?.meta),updated_at:x?.updated_at||null
  })).filter(x=>x.catalog_key&&COMMON_SHOP_KINDS.has(x.kind)):[];
  const premium=Array.isArray(raw?.premium)?raw.premium.map(x=>({
    id:String(x?.id||'').slice(0,80),name:String(x?.name||'').slice(0,100),category:String(x?.category||'').slice(0,32),
    price_brl:clampNum(x?.price_brl,0,99999,0),item_id:x?.item_id==null?null:String(x.item_id).slice(0,64),quantity:Math.max(1,Math.min(10000000,Math.floor(Number(x?.quantity)||1))),
    description:String(x?.description||'').slice(0,300),active:x?.active!==false,sort_order:Math.round(clampNum(x?.sort_order,0,9999,100)),min_level:Math.round(clampNum(x?.min_level,1,100,1)),
    meta:{days:Math.max(1,Math.min(3650,Math.floor(Number(x?.meta?.days)||30)))}
  })).filter(x=>x.id):[];
  return {version:Math.max(0,Number(raw?.version)||0),updated_at:raw?.updated_at||null,common,premium,generated_at:new Date().toISOString(),source:'render-temp-json'};
}
async function writeShopsRuntimeFile(payload){await fs.mkdir(TOPBAR_RUNTIME_DIR,{recursive:true});const tmp=`${SHOPS_RUNTIME_FILE}.${process.pid}.tmp`;await fs.writeFile(tmp,JSON.stringify(payload),{encoding:'utf8'});await fs.rename(tmp,SHOPS_RUNTIME_FILE);}
async function readShopsRuntimeFile(){try{const text=await fs.readFile(SHOPS_RUNTIME_FILE,'utf8');const parsed=JSON.parse(text);return parsed&&Array.isArray(parsed.common)&&Array.isArray(parsed.premium)?parsed:null;}catch{return null;}}
async function refreshShopsRuntimeSnapshot(force=false){
  const now=Date.now();if(!force&&shopsRuntimeCache&&now-shopsRuntimeCacheAt<SHOPS_RUNTIME_CACHE_MS)return shopsRuntimeCache;
  const sb=supabaseBase();if(!sb)throw new Error('Supabase indisponível para configuração das lojas.');const {data,error}=await sb.rpc('get_shops_runtime_config_v1817c');if(error)throw new Error(`Falha ao carregar shops runtime: ${error.message}`);
  const payload=sanitizeShopsRuntime(data||{});if(!payload.common.length||!payload.premium.length)throw new Error('Snapshot das lojas veio incompleto.');await writeShopsRuntimeFile(payload);shopsRuntimeCache=payload;shopsRuntimeCacheAt=now;return payload;
}
async function loadShopsRuntimeSnapshot(force=false){try{return await refreshShopsRuntimeSnapshot(force);}catch(err){const disk=await readShopsRuntimeFile();if(disk){shopsRuntimeCache=disk;shopsRuntimeCacheAt=Date.now();return disk;}throw err;}}

function clampNum(value,min,max,fallback){
  const n=Number(value);return Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback;
}
function safeWorldId(value){return /^[A-Za-z0-9_-]{1,32}$/.test(String(value||''))?String(value):'';}
function safeSector(value){return /^[A-Za-z0-9_-]{1,24}$/.test(String(value||''))?String(value):'';}
function sanitizeWorldRuntime(raw){
  const resources=Array.isArray(raw?.resources)?raw.resources.map(x=>({
    resource_key:safeWorldId(x?.resource_key),name:String(x?.name||'').slice(0,48),color:String(x?.color||'#ffffff').slice(0,24),
    sell_price:Math.max(0,Math.round(Number(x?.sell_price)||0)),enabled:x?.enabled!==false
  })).filter(x=>x.resource_key):[];
  const maps=Array.isArray(raw?.maps)?raw.maps.map(x=>({
    map_id:safeWorldId(x?.map_id),label:x?.label==null?null:String(x.label).slice(0,24),tier:Math.round(Number(x?.tier)||1),
    name:String(x?.name||'Setor').slice(0,64),risk:String(x?.risk||'Normal').slice(0,32),
    world_w:Math.round(clampNum(x?.world_w,1000,50000,6000)),world_h:Math.round(clampNum(x?.world_h,1000,50000,4500)),
    enemy_multiplier:clampNum(x?.enemy_multiplier,.1,10,1),ore_count:Math.round(clampNum(x?.ore_count,0,1000,0)),
    ore_respawn_min_ms:Math.round(clampNum(x?.ore_respawn_min_ms,1000,600000,5000)),ore_respawn_max_ms:Math.round(clampNum(x?.ore_respawn_max_ms,1000,600000,12000)),
    landmark_count:Math.round(clampNum(x?.landmark_count,0,100,0)),min_level:Math.round(clampNum(x?.min_level,1,100,1)),
    battle:!!x?.battle,gate:!!x?.gate,enabled:x?.enabled!==false,
    palette:x?.palette&&typeof x.palette==='object'?x.palette:{},structures:Array.isArray(x?.structures)?x.structures.slice(0,30).map(v=>String(v).slice(0,64)):[]
  })).filter(x=>x.map_id):[];
  const map_resources=Array.isArray(raw?.map_resources)?raw.map_resources.map(x=>({
    map_id:safeWorldId(x?.map_id),resource_key:safeWorldId(x?.resource_key),weight:clampNum(x?.weight,.01,1000,1),enabled:x?.enabled!==false
  })).filter(x=>x.map_id&&x.resource_key):[];
  const sectors=Array.isArray(raw?.sectors)?raw.sectors.map(x=>({
    sector_label:safeSector(x?.sector_label),map_id:safeWorldId(x?.map_id),territory_faction:x?.territory_faction==null?null:safeWorldId(x.territory_faction),
    graph_x:clampNum(x?.graph_x,0,100,50),graph_y:clampNum(x?.graph_y,0,100,50),min_level:Math.round(clampNum(x?.min_level,1,100,1)),enabled:x?.enabled!==false
  })).filter(x=>x.sector_label&&x.map_id):[];
  const portals=Array.isArray(raw?.portals)?raw.portals.map(x=>({
    portal_key:safeWorldId(x?.portal_key),from_sector:safeSector(x?.from_sector),to_sector:safeSector(x?.to_sector),
    bidirectional:x?.bidirectional!==false,enabled:x?.enabled!==false,sort_order:Math.round(clampNum(x?.sort_order,0,9999,100))
  })).filter(x=>x.portal_key&&x.from_sector&&x.to_sector):[];
  return {version:Math.max(0,Number(raw?.version)||0),updated_at:raw?.updated_at||null,resources,maps,map_resources,sectors,portals,generated_at:new Date().toISOString(),source:'render-temp-json'};
}
async function writeWorldRuntimeFile(payload){
  await fs.mkdir(TOPBAR_RUNTIME_DIR,{recursive:true});
  const tmp=`${WORLD_RUNTIME_FILE}.${process.pid}.tmp`;
  await fs.writeFile(tmp,JSON.stringify(payload),{encoding:'utf8'});
  await fs.rename(tmp,WORLD_RUNTIME_FILE);
}
async function readWorldRuntimeFile(){
  try{const text=await fs.readFile(WORLD_RUNTIME_FILE,'utf8');const parsed=JSON.parse(text);return parsed&&Array.isArray(parsed.maps)?parsed:null;}catch{return null;}
}
async function refreshWorldRuntimeSnapshot(force=false){
  const now=Date.now();
  if(!force&&worldRuntimeCache&&now-worldRuntimeCacheAt<WORLD_RUNTIME_CACHE_MS)return worldRuntimeCache;
  const sb=supabaseBase();if(!sb)throw new Error('Supabase indisponível para configuração do mundo.');
  const {data,error}=await sb.rpc('get_world_runtime_config_v1814');
  if(error)throw new Error(`Falha ao carregar world runtime: ${error.message}`);
  const payload=sanitizeWorldRuntime(data||{});
  if(!payload.maps.length||!payload.sectors.length)throw new Error('Snapshot do mundo veio vazio.');
  await writeWorldRuntimeFile(payload);worldRuntimeCache=payload;worldRuntimeCacheAt=now;return payload;
}
async function loadWorldRuntimeSnapshot(force=false){
  try{return await refreshWorldRuntimeSnapshot(force);}catch(err){const disk=await readWorldRuntimeFile();if(disk){worldRuntimeCache=disk;worldRuntimeCacheAt=Date.now();return disk;}throw err;}
}

function sanitizeTopbarRuntime(raw){
  const modules=Array.isArray(raw?.modules)?raw.modules.filter(x=>x&&TOPBAR_ALLOWED_MODULES.has(String(x.module_key||''))).map(x=>({
    module_key:String(x.module_key),
    parent_key:x.parent_key==null?null:String(x.parent_key),
    label:String(x.label||'').slice(0,40),
    sort_order:Math.max(0,Math.min(999,Number(x.sort_order)||100)),
    min_level:Math.max(1,Math.min(100,Number(x.min_level)||1)),
    enabled:x.enabled!==false,
    hide_until_level:!!x.hide_until_level,
    admin_only:!!x.admin_only,
    config:x.config&&typeof x.config==='object'?x.config:{}
  })):[];
  const flags=Array.isArray(raw?.flags)?raw.flags.filter(x=>x&&TOPBAR_ALLOWED_FLAGS.has(String(x.flag_key||''))).map(x=>({
    flag_key:String(x.flag_key),enabled:x.enabled!==false,description:String(x.description||'').slice(0,180),
    config:x.config&&typeof x.config==='object'?x.config:{}
  })):[];
  return {
    version:Math.max(0,Number(raw?.version)||0),updated_at:raw?.updated_at||null,
    modules,flags,generated_at:new Date().toISOString(),source:'render-temp-json'
  };
}

async function writeTopbarRuntimeFile(payload){
  await fs.mkdir(TOPBAR_RUNTIME_DIR,{recursive:true});
  const tmp=`${TOPBAR_RUNTIME_FILE}.${process.pid}.tmp`;
  await fs.writeFile(tmp,JSON.stringify(payload),{encoding:'utf8'});
  await fs.rename(tmp,TOPBAR_RUNTIME_FILE);
}

async function readTopbarRuntimeFile(){
  try{
    const text=await fs.readFile(TOPBAR_RUNTIME_FILE,'utf8');
    const parsed=JSON.parse(text);
    return parsed&&Array.isArray(parsed.modules)?parsed:null;
  }catch{return null;}
}

async function refreshTopbarRuntimeSnapshot(force=false){
  const now=Date.now();
  if(!force&&topbarRuntimeCache&&now-topbarRuntimeCacheAt<TOPBAR_RUNTIME_CACHE_MS)return topbarRuntimeCache;
  const sb=supabaseBase();
  if(!sb)throw new Error('Supabase indisponível para configuração da topbar.');
  const {data,error}=await sb.rpc('get_game_runtime_public_v1813');
  if(error)throw new Error(`Falha ao carregar topbar runtime: ${error.message}`);
  const payload=sanitizeTopbarRuntime(data||{});
  if(!payload.modules.length)throw new Error('Snapshot da topbar veio vazio.');
  await writeTopbarRuntimeFile(payload);
  topbarRuntimeCache=payload;
  topbarRuntimeCacheAt=now;
  return payload;
}

async function loadTopbarRuntimeSnapshot(force=false){
  try{return await refreshTopbarRuntimeSnapshot(force);}catch(err){
    const disk=await readTopbarRuntimeFile();
    if(disk){topbarRuntimeCache=disk;topbarRuntimeCacheAt=Date.now();return disk;}
    throw err;
  }
}

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

async function writeNpcRuntimeFile(payload){await fs.mkdir(TOPBAR_RUNTIME_DIR,{recursive:true});const tmp=`${NPC_RUNTIME_FILE}.${process.pid}.tmp`;await fs.writeFile(tmp,JSON.stringify(payload),{encoding:'utf8'});await fs.rename(tmp,NPC_RUNTIME_FILE);}
async function readNpcRuntimeFile(){try{const text=await fs.readFile(NPC_RUNTIME_FILE,'utf8');const parsed=JSON.parse(text);return parsed&&Array.isArray(parsed.npcs)&&Array.isArray(parsed.spawns)?parsed:null;}catch{return null;}}
async function refreshNpcRuntimeSnapshot(force=false){
  const now=Date.now();
  if(!force&&npcRuntimeCache&&now-npcRuntimeCacheAt<NPC_CONFIG_CACHE_MS)return npcRuntimeCache;
  const sb=supabaseBase();
  if(!sb)throw new Error('Supabase indisponível para configuração de NPCs.');
  const {data,error}=await sb.rpc('get_npc_runtime_config_v1811');
  if(error)throw new Error(`Falha ao carregar configuração de NPCs: ${error.message}`);
  const payload=(data&&typeof data==='object')?data:{version:0,npcs:[],spawns:[]};
  if(!Array.isArray(payload.npcs)||!payload.npcs.length)throw new Error('Snapshot de NPCs veio incompleto.');
  await writeNpcRuntimeFile(payload);npcRuntimeCache=payload;npcRuntimeCacheAt=now;return payload;
}
async function loadNpcRuntimeSnapshot(force=false){try{return await refreshNpcRuntimeSnapshot(force);}catch(err){const disk=await readNpcRuntimeFile();if(disk){npcRuntimeCache=disk;npcRuntimeCacheAt=Date.now();return disk;}throw err;}}

function liveCatalogRow(snapshot,key){
  return (snapshot?.catalog||[]).find(row=>row?.enabled&&String(row.catalog_key||'')===String(key||''))||null;
}
function premiumDiscountEligible(row){
  return row?.currency==='uridium'&&['ship','laser','generator','drone','extra','pet','pet_gear'].includes(String(row?.kind||''));
}
const PET_LASER_CAP_BY_LEVEL=[0,2,2,3,3,4,4,5,5,6,6,7,7,8,9,10,10,11,11,12,12];
const PET_SHIELD_CAP_BY_LEVEL=[0,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22];
function petSlotCapacityServer(kind,level){const lv=Math.max(1,Math.min(20,Number(level)||1));return kind==='shield'?PET_SHIELD_CAP_BY_LEVEL[lv]:PET_LASER_CAP_BY_LEVEL[lv];}
function ensurePetState(state){
  state.pet ||= {owned:false,level:1,xp:0,xpModelV175:true,laserSlotsUnlocked:0,shieldSlotsUnlocked:0,lasers:[],shields:[],gearsOwned:{guard:false,box:false,ore:false,repair:false,kami:false},activeGear:'off',kamikazeReadyAt:0};
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
  if(kind==='pet_base'){const pet=ensurePetState(state);if(pet.owned)throw Object.assign(new Error('AUX-9 já adquirido.'),{status:409});pet.owned=true;pet.level=Math.max(1,Number(pet.level)||1);pet.laserSlotsUnlocked=Math.max(1,Number(pet.laserSlotsUnlocked)||1);pet.shieldSlotsUnlocked=Math.max(2,Number(pet.shieldSlotsUnlocked)||2);pet.lasers=pet.lasers.length?pet.lasers:[null];pet.shields=pet.shields.length?pet.shields:[null,null];return;}
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
  alpha:{key:'alpha',label:'AURORA',pieces:34,unlock:null,baseLives:3,maxLives:5},
  beta:{key:'beta',label:'NEXUS',pieces:48,unlock:null,baseLives:3,maxLives:5},
  gamma:{key:'gamma',label:'ECLIPSE',pieces:64,unlock:null,baseLives:3,maxLives:5},
};
const GATE_AMMO={lcb10:{name:'PLS-1',base:300},mcb25:{name:'PLS-2',base:200},mcb50:{name:'PLS-3',base:120},ucb100:{name:'PLS-4',base:70}};
const GATE_ROCKETS={r310:{name:'R-310',base:15},plt2026:{name:'PLT-2026',base:10},plt2021:{name:'PLT-2021',base:7},plt3030:{name:'PLT-3030',base:5}};
function randomChoiceServer(list){return list[Math.floor(Math.random()*list.length)];}
function randomIntServer(min,max){return Math.floor(min+Math.random()*(max-min+1));}
function ensureGalaxyGateServer(state){
  state.galaxyGate ||= {jumpBonus:0,lifeBonus:0,repairBonus:0,lastResults:[],selected:'alpha'};
  const g=state.galaxyGate;g.jumpBonus=Math.max(0,Number(g.jumpBonus)||0);g.lifeBonus=Math.max(0,Number(g.lifeBonus)||0);g.repairBonus=Math.max(0,Number(g.repairBonus)||0);g.lastResults=Array.isArray(g.lastResults)?g.lastResults:[];g.selected=GATE_SERVER_DEFS[g.selected]?g.selected:'alpha';
  for(const [key,def] of Object.entries(GATE_SERVER_DEFS)){
    g[key] ||= {pieces:[],built:false,lives:def.baseLives,completed:0,failed:0,run:null,lastCompletion:null};
    const x=g[key];x.pieces=Array.isArray(x.pieces)?[...new Set(x.pieces.map(Number).filter(n=>n>=1&&n<=def.pieces))]:[];x.built=!!x.built||x.pieces.length>=def.pieces;x.lives=Math.max(0,Math.min(def.maxLives,Number(x.lives)||def.baseLives));x.completed=Math.max(0,Number(x.completed)||0);
  }
  return g;
}
function gateUnlockedServer(state,key){return !!GATE_SERVER_DEFS[key];}
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
  g.lifeBonus=(g.lifeBonus||0)+1;return {kind:'life',label:'Vida Astral Reserva +1'};
}
async function readEconomySave(req){
  const {data,error}=await req.sb.from('game_saves').select('state').eq('user_id',req.user.id).maybeSingle();if(error)throw new Error(error.message);if(!data?.state)throw Object.assign(new Error('Save online ainda não foi criado.'),{status:409});const state=structuredClone(data.state);if(String(state.accountOwnerId||req.user.id)!==req.user.id)throw Object.assign(new Error('SAVE BLOQUEADO: proprietário inválido.'),{status:409});state.profile ||= {};return state;
}
async function writeEconomySave(req,state){
  state.accountOwnerId=req.user.id;state.accountOwnerEmail=req.user.email||null;const updated_at=new Date().toISOString();
  const profile=state.profile||{};let securedCallsign=normalizeCallsign(profile.callsign||'');if(!securedCallsign)securedCallsign=await ensureProfile(req.sb,req.user);
  state.profile={...profile,callsign:securedCallsign};
  const savePromise=req.sb.from('game_saves').upsert({user_id:req.user.id,state,updated_at},{onConflict:'user_id'});
  const profilePromise=req.sb.from('profiles').upsert({id:req.user.id,callsign:securedCallsign,faction:profile.faction||null,level:Number(profile.level||1),xp:Number(profile.xp||0),credits:Number(profile.credits||0),uridium:Number(profile.uridium||0),aliens_killed:Number(profile.aliensKilled||0),gg_completed:Number(state.galaxyGate?.alpha?.completed||profile.ggCompleted||0),updated_at},{onConflict:'id'});
  const [{error:saveError},{error:profileError}]=await Promise.all([savePromise,profilePromise]);if(saveError)throw new Error(saveError.message);if(profileError)throw new Error(profileError.message);return updated_at;
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


async function accountAccessState(sb){
  try{
    const {data,error}=await sb.rpc('get_my_account_access_v1763');
    if(error){
      // Compatibilidade temporária se o deploy do front ocorrer antes da migration.
      if(String(error.code||'')==='42883'||/get_my_account_access_v1763.*does not exist/i.test(String(error.message||'')))return {allowed:true,is_banned:false};
      throw new Error(`Falha ao validar acesso da conta: ${error.message}`);
    }
    return data&&typeof data==='object'?data:{allowed:true,is_banned:false};
  }catch(err){throw err;}
}

function bannedResponse(res,access){
  const until=access?.banned_until?` até ${new Date(access.banned_until).toLocaleString('pt-BR')}`:'';
  const reason=String(access?.reason||'').trim();
  return res.status(403).json({error:`Conta banida${until}.${reason?` Motivo: ${reason}`:''}`,code:'ACCOUNT_BANNED',banned_until:access?.banned_until||null,reason:reason||null});
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
    const access=await accountAccessState(req.sb);
    if(access?.is_banned||access?.allowed===false)return bannedResponse(res,access);
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

app.get('/health', (req, res) => res.json({ ok: true, game: 'Stellar Legacy', version: '18.2.2', universe: 'shared' }));


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
  version: '18.2.2',
  authReady: Boolean(SUPABASE_URL && SUPABASE_KEY),
  diagnostics: configStatus(),
  features: ['login', 'cloud_save', 'factions', 'safe_zone', 'shop', 'owned_ships', 'equipment_slots', 'inventory', 'drones', 'ammo', 'rockets', 'expanded_expedition_maps', 'cargo_hold', 'ore_trading', 'npc_cargo_boxes', 'npc_respawn', 'minimap_navigation', 'waypoints', 'landmark_discovery', 'combat_fx', 'pet_modules', 'auto_buy_cpu', 'v8_asset_identity', 'mission_control_v93', 'mission_acceptance_tracking', 'expanded_enemy_density', 'online_player_presence', 'real_player_auction', 'rank_nameplates_v12', 'clans_v12', 'clan_vault_v12', 'premium_shop_v12', 'battle_pass_paid_v12', 'premium_subscription_v12', 'clan_daily_economy_v12', 'portal_neutral_zone_v12', 'base_only_equipment_v12', 'single_session_v1214', 'manual_login_v141', 'account_bound_save_v141', 'unique_callsign_v141', 'premium_auto_combat_v141', 'shared_universe_v15', 'authoritative_npcs_v15', 'shared_ores_v15', 'shared_events_v15', 'websocket_world_v15', 'npc_contribution_v15', 'realtime_player_socket_v151', 'remote_laser_fx_v151', 'remote_aux9_v151', 'low_latency_world_v151', 'live_ops_v16', 'server_authoritative_shop_v16', 'supabase_event_schedule_v16', 'economy_guard_v161', 'server_auto_buy_v161', 'server_trader_v161', 'server_pet_slots_v161', 'server_materializer_v161', 'server_quantum_cores_v161', 'economy_fast_path_v1767', 'chat_dock_v162', 'drone_designers_v163', 'designer_sets_v163', 'nexus_eclipse_designer_drops_v163', 'global_chat_v162', 'clan_chat_v162', 'private_chat_v162', 'bottom_hud_reflow_v162', 'ship_designers_v165', 'aux_designers_v165', 'designer_ship_abilities_v165', 'event_designer_drops_v165', 'social_minimap_v165', 'realtime_designer_visuals_v165', 'data_driven_core_v1810', 'data_driven_npcs_v1811', 'server_runtime_topbar_cache_v1813', 'data_driven_world_v1814', 'data_driven_systems_v1815', 'admin_runtime_monitor_v1816a', 'admin_interface_editor_v1816b', 'admin_npc_editor_v1816c', 'admin_world_editor_v1816d', 'admin_systems_editor_v1816e', 'event_scheduler_v1817a', 'battle_pass_data_driven_v1817b', 'shops_data_driven_v1817c'],
}));


app.get('/api/runtime/topbar', requireUser, asyncRoute(async (req,res)=>{
  const snapshot=await loadTopbarRuntimeSnapshot(Boolean(req.query?.refresh));
  let isAdmin=false;
  try{
    const {data}=await req.sb.rpc('admin_status_v1763');
    isAdmin=!!data?.is_admin;
  }catch{}
  res.set('Cache-Control','no-store');
  res.json({...snapshot,is_admin:isAdmin});
}));

app.get('/api/runtime/npcs', requireUser, asyncRoute(async (req,res)=>{
  const snapshot=await loadNpcRuntimeSnapshot(Boolean(req.query?.refresh));
  res.set('Cache-Control','no-store');
  res.json(snapshot);
}));

async function runtimeFileStatus(file){
  try{const st=await fs.stat(file);return {exists:true,file:path.basename(file),bytes:st.size,updated_at:st.mtime.toISOString()};}
  catch{return {exists:false,file:path.basename(file),bytes:0,updated_at:null};}
}
app.get('/api/admin/runtime-monitor', requireUser, asyncRoute(async(req,res)=>{
  const {data:adm,error:admErr}=await req.sb.rpc('admin_status_v1763');
  if(admErr||!adm?.is_admin)return res.status(403).json({error:'Acesso administrativo negado.'});
  const force=String(req.query?.refresh||'')==='1';
  const jobs=[
    ['topbar',()=>loadTopbarRuntimeSnapshot(force),TOPBAR_RUNTIME_FILE],
    ['npcs',()=>loadNpcRuntimeSnapshot(force),NPC_RUNTIME_FILE],
    ['world',()=>loadWorldRuntimeSnapshot(force),WORLD_RUNTIME_FILE],
    ['systems',()=>loadSystemsRuntimeSnapshot(force),SYSTEMS_RUNTIME_FILE],
    ['pass',()=>loadPassRuntimeSnapshot(force),PASS_RUNTIME_FILE],
    ['shops',()=>loadShopsRuntimeSnapshot(force),SHOPS_RUNTIME_FILE],
  ];
  const out={};
  for(const [key,loader,file] of jobs){
    try{const cfg=await loader();const f=await runtimeFileStatus(file);out[key]={ok:true,version:Number(cfg?.version)||0,source:String(cfg?.source||'render-temp-json'),config_updated_at:cfg?.updated_at||null,...f};}
    catch(err){const f=await runtimeFileStatus(file);out[key]={ok:false,version:0,source:'unavailable',config_updated_at:null,error:err?.message||'Falha no runtime',...f};}
  }
  res.set('Cache-Control','no-store');
  res.json({ok:true,generated_at:new Date().toISOString(),runtimes:out});
}));

// V18.1.6B — editor isolado da Interface. Somente módulos já conhecidos pelo motor.
app.post('/api/admin/runtime/interface/:moduleKey', requireUser, asyncRoute(async(req,res)=>{
  const key=String(req.params?.moduleKey||'').trim();
  if(!TOPBAR_ALLOWED_MODULES.has(key))return res.status(400).json({error:'Módulo de interface inválido.'});
  const body=req.body&&typeof req.body==='object'?req.body:{};
  const label=String(body.label||'').trim().slice(0,40);
  if(!label)return res.status(400).json({error:'Informe um nome para a aba.'});
  const sortOrder=Math.max(0,Math.min(999,Math.trunc(Number(body.sort_order)||0)));
  let minLevel=Math.max(1,Math.min(100,Math.trunc(Number(body.min_level)||1)));
  let enabled=body.enabled!==false;
  let hideUntilLevel=!!body.hide_until_level;
  // Proteção: o ADM nunca pode se auto-ocultar pelo editor.
  if(key==='admin'){minLevel=1;enabled=true;hideUntilLevel=false;}
  const {data,error}=await req.sb.rpc('admin_update_ui_module_v1810',{
    p_module_key:key,p_label:label,p_sort_order:sortOrder,p_min_level:minLevel,
    p_enabled:enabled,p_hide_until_level:hideUntilLevel,p_config:null
  });
  if(error){const msg=String(error.message||'Falha ao salvar módulo.');const denied=/administrativ|permiss|negado/i.test(msg);return res.status(denied?403:400).json({error:msg});}
  // Materializa imediatamente o novo JSON no Render.
  const runtime=await refreshTopbarRuntimeSnapshot(true);
  res.set('Cache-Control','no-store');
  res.json({ok:true,module_key:key,runtime:{...runtime,is_admin:true},saved:data||null});
}));

// V18.1.6C — editor isolado de NPCs. Só atributos e spawns já existentes.
app.post('/api/admin/runtime/npcs/:npcKey', requireUser, asyncRoute(async(req,res)=>{
  const key=String(req.params?.npcKey||'').trim();
  const current=await loadNpcRuntimeSnapshot(false);
  const currentRow=current?.npcs?.find(x=>String(x.npc_key)===key);
  if(!currentRow)return res.status(400).json({error:'NPC inválido.'});
  const body=req.body&&typeof req.body==='object'?req.body:{};
  const name=String(body.name||'').trim().slice(0,48);
  if(!name)return res.status(400).json({error:'Informe o nome do NPC.'});
  const respawnMin=Math.round(clampNum(body.respawn_min_ms,1000,600000,6000));
  const respawnMax=Math.round(clampNum(body.respawn_max_ms,1000,600000,13000));
  if(respawnMax<respawnMin)return res.status(400).json({error:'Respawn máximo deve ser maior ou igual ao mínimo.'});
  const args={
    p_npc_key:key,p_name:name,
    p_hp:Math.round(clampNum(body.hp,1,1000000000,1)),
    p_shield:Math.round(clampNum(body.shield,0,1000000000,0)),
    p_credits:Math.round(clampNum(body.credits,0,1000000000000,0)),
    p_stl:Math.round(clampNum(body.stl,0,1000000000,0)),
    p_xp:Math.round(clampNum(body.xp,0,1000000000000,0)),
    p_speed:clampNum(body.speed,1,1000,30),
    p_damage:Math.round(clampNum(body.damage,0,1000000000,0)),
    p_color:String(currentRow.color||'#ff755d'),p_size:clampNum(currentRow.size,4,250,18),p_resources:currentRow.resources&&typeof currentRow.resources==='object'?currentRow.resources:{},
    p_respawn_min_ms:respawnMin,p_respawn_max_ms:respawnMax,
    p_enabled:body.enabled!==false
  };
  const {data,error}=await req.sb.rpc('admin_update_npc_v1811',args);
  if(error){const msg=String(error.message||'Falha ao salvar NPC.');const denied=/administrativ|permiss|negado/i.test(msg);return res.status(denied?403:400).json({error:msg});}
  const runtime=await refreshNpcRuntimeSnapshot(true);
  res.set('Cache-Control','no-store');res.json({ok:true,npc_key:key,runtime,saved:data||null});
}));

app.post('/api/admin/runtime/npcs/:npcKey/spawns/:mapId', requireUser, asyncRoute(async(req,res)=>{
  const key=String(req.params?.npcKey||'').trim(),mapId=String(req.params?.mapId||'').trim();
  const current=await loadNpcRuntimeSnapshot(false);
  if(!current?.spawns?.some(x=>String(x.npc_key)===key&&String(x.map_id)===mapId))return res.status(400).json({error:'Vínculo NPC/mapa inválido nesta etapa.'});
  const body=req.body&&typeof req.body==='object'?req.body:{};
  const count=Math.round(clampNum(body.spawn_count,0,500,0));
  const {data,error}=await req.sb.rpc('admin_update_map_npc_spawn_v1811',{p_map_id:mapId,p_npc_key:key,p_spawn_count:count,p_enabled:body.enabled!==false});
  if(error){const msg=String(error.message||'Falha ao salvar população.');const denied=/administrativ|permiss|negado/i.test(msg);return res.status(denied?403:400).json({error:msg});}
  const runtime=await refreshNpcRuntimeSnapshot(true);
  res.set('Cache-Control','no-store');res.json({ok:true,npc_key:key,map_id:mapId,runtime,saved:data||null});
}));


// V18.1.6D — editor isolado do Mundo. Não toca em Missões/Economia/Crafting.
app.post('/api/admin/runtime/world/maps/:mapId', requireUser, asyncRoute(async(req,res)=>{
  const mapId=safeWorldId(req.params?.mapId);const current=await loadWorldRuntimeSnapshot(false);const row=current?.maps?.find(x=>String(x.map_id)===mapId);if(!mapId||!row)return res.status(400).json({error:'Mapa inválido.'});
  const body=req.body&&typeof req.body==='object'?req.body:{};const name=String(body.name||'').trim().slice(0,64),risk=String(body.risk||'').trim().slice(0,32);if(!name||!risk)return res.status(400).json({error:'Nome e risco do mapa são obrigatórios.'});
  const respawnMin=Math.round(clampNum(body.ore_respawn_min_ms,1000,600000,row.ore_respawn_min_ms||5000)),respawnMax=Math.round(clampNum(body.ore_respawn_max_ms,1000,600000,row.ore_respawn_max_ms||12000));if(respawnMax<respawnMin)return res.status(400).json({error:'Respawn máximo deve ser maior ou igual ao mínimo.'});
  const {data,error}=await req.sb.rpc('admin_update_map_v1814',{p_map_id:mapId,p_name:name,p_risk:risk,p_world_w:Math.round(clampNum(body.world_w,1000,50000,row.world_w||6000)),p_world_h:Math.round(clampNum(body.world_h,1000,50000,row.world_h||4500)),p_enemy_multiplier:null,p_ore_count:Math.round(clampNum(body.ore_count,0,1000,row.ore_count||0)),p_ore_respawn_min_ms:respawnMin,p_ore_respawn_max_ms:respawnMax,p_landmark_count:null,p_min_level:Math.round(clampNum(body.min_level,1,100,row.min_level||1)),p_enabled:body.enabled!==false,p_palette:null,p_structures:null});
  if(error){const msg=String(error.message||'Falha ao salvar mapa.');return res.status(/administrativ|permiss|negado/i.test(msg)?403:400).json({error:msg});}
  const runtime=await refreshWorldRuntimeSnapshot(true);res.set('Cache-Control','no-store');res.json({ok:true,map_id:mapId,runtime,saved:data||null});
}));
app.post('/api/admin/runtime/world/resources/:resourceKey', requireUser, asyncRoute(async(req,res)=>{
  const key=safeWorldId(req.params?.resourceKey);const current=await loadWorldRuntimeSnapshot(false);const row=current?.resources?.find(x=>String(x.resource_key)===key);if(!key||!row)return res.status(400).json({error:'Recurso inválido.'});
  const body=req.body&&typeof req.body==='object'?req.body:{};const name=String(body.name||'').trim().slice(0,48),color=String(body.color||'').trim();if(!name)return res.status(400).json({error:'Informe o nome do recurso.'});if(!/^#[0-9a-f]{6}$/i.test(color))return res.status(400).json({error:'Cor inválida. Use #RRGGBB.'});
  const {data,error}=await req.sb.rpc('admin_update_resource_v1814',{p_resource_key:key,p_name:name,p_color:color,p_sell_price:Math.max(0,Math.round(Number(body.sell_price)||0)),p_enabled:body.enabled!==false});if(error){const msg=String(error.message||'Falha ao salvar recurso.');return res.status(/administrativ|permiss|negado/i.test(msg)?403:400).json({error:msg});}
  const runtime=await refreshWorldRuntimeSnapshot(true);res.set('Cache-Control','no-store');res.json({ok:true,resource_key:key,runtime,saved:data||null});
}));
app.post('/api/admin/runtime/world/sectors/:sectorLabel', requireUser, asyncRoute(async(req,res)=>{
  const key=safeSector(req.params?.sectorLabel);const current=await loadWorldRuntimeSnapshot(false);const row=current?.sectors?.find(x=>String(x.sector_label)===key);if(!key||!row)return res.status(400).json({error:'Setor inválido.'});const body=req.body&&typeof req.body==='object'?req.body:{};
  const {data,error}=await req.sb.rpc('admin_update_sector_v1814',{p_sector_label:key,p_graph_x:clampNum(body.graph_x,0,100,row.graph_x||0),p_graph_y:clampNum(body.graph_y,0,100,row.graph_y||0),p_min_level:Math.round(clampNum(body.min_level,1,100,row.min_level||1)),p_enabled:body.enabled!==false});if(error){const msg=String(error.message||'Falha ao salvar setor.');return res.status(/administrativ|permiss|negado/i.test(msg)?403:400).json({error:msg});}
  const runtime=await refreshWorldRuntimeSnapshot(true);res.set('Cache-Control','no-store');res.json({ok:true,sector_label:key,runtime,saved:data||null});
}));
app.post('/api/admin/runtime/world/portals/:portalKey', requireUser, asyncRoute(async(req,res)=>{
  const key=safeWorldId(req.params?.portalKey);const current=await loadWorldRuntimeSnapshot(false);const row=current?.portals?.find(x=>String(x.portal_key)===key);if(!key||!row)return res.status(400).json({error:'Portal inválido.'});const body=req.body&&typeof req.body==='object'?req.body:{};
  const {data,error}=await req.sb.rpc('admin_update_portal_link_v1814',{p_portal_key:key,p_enabled:body.enabled!==false,p_bidirectional:body.bidirectional!==false,p_sort_order:Math.round(clampNum(body.sort_order,0,9999,row.sort_order||100))});if(error){const msg=String(error.message||'Falha ao salvar portal.');return res.status(/administrativ|permiss|negado/i.test(msg)?403:400).json({error:msg});}
  const runtime=await refreshWorldRuntimeSnapshot(true);res.set('Cache-Control','no-store');res.json({ok:true,portal_key:key,runtime,saved:data||null});
}));
app.post('/api/admin/runtime/world/maps/:mapId/resources/:resourceKey', requireUser, asyncRoute(async(req,res)=>{
  const mapId=safeWorldId(req.params?.mapId),resourceKey=safeWorldId(req.params?.resourceKey);const current=await loadWorldRuntimeSnapshot(false);if(!current?.map_resources?.some(x=>String(x.map_id)===mapId&&String(x.resource_key)===resourceKey))return res.status(400).json({error:'Vínculo mapa/recurso inválido nesta etapa.'});const body=req.body&&typeof req.body==='object'?req.body:{};
  const {data,error}=await req.sb.rpc('admin_update_map_resource_pool_v1816',{p_map_id:mapId,p_resource_key:resourceKey,p_weight:clampNum(body.weight,.01,1000,1),p_enabled:body.enabled!==false});if(error){const msg=String(error.message||'Falha ao salvar pool de minério.');return res.status(/administrativ|permiss|negado/i.test(msg)?403:400).json({error:msg});}
  const runtime=await refreshWorldRuntimeSnapshot(true);res.set('Cache-Control','no-store');res.json({ok:true,map_id:mapId,resource_key:resourceKey,runtime,saved:data||null});
}));

app.get('/api/runtime/world', requireUser, asyncRoute(async (req,res)=>{
  const snapshot=await loadWorldRuntimeSnapshot(Boolean(req.query?.refresh));
  res.set('Cache-Control','no-store');
  res.json(snapshot);
}));


// V18.1.6E — editor isolado de Sistemas. Não toca em Interface/NPCs/Mundo.
app.post('/api/admin/runtime/systems/missions/:category', requireUser, asyncRoute(async(req,res)=>{
  const key=safeWorldId(req.params?.category);const current=await loadSystemsRuntimeSnapshot(false);const row=current?.mission_categories?.find(x=>String(x.category)===key);if(!key||!row)return res.status(400).json({error:'Categoria de missão inválida.'});
  const body=req.body&&typeof req.body==='object'?req.body:{};const config=body.config&&typeof body.config==='object'&&!Array.isArray(body.config)?body.config:null;if(!config)return res.status(400).json({error:'Configuração da missão precisa ser um objeto JSON.'});if(JSON.stringify(config).length>12000)return res.status(400).json({error:'Configuração da missão muito grande.'});
  const {data,error}=await req.sb.rpc('admin_update_mission_category_v1815',{p_category:key,p_min_level:Math.round(clampNum(body.min_level,1,100,row.min_level||1)),p_reward_factor:clampNum(body.reward_factor,0,10,row.reward_factor||0),p_item_chance:clampNum(body.item_chance,0,1,row.item_chance||0),p_enabled:body.enabled!==false,p_config:config});if(error){const msg=String(error.message||'Falha ao salvar missão.');return res.status(/administrativ|permiss|negado/i.test(msg)?403:400).json({error:msg});}
  const runtime=await refreshSystemsRuntimeSnapshot(true);res.set('Cache-Control','no-store');res.json({ok:true,category:key,runtime,saved:data||null});
}));
app.post('/api/admin/runtime/systems/economy/:serviceId', requireUser, asyncRoute(async(req,res)=>{
  const key=safeWorldId(req.params?.serviceId);const current=await loadSystemsRuntimeSnapshot(false);const row=current?.economy_services?.find(x=>String(x.service_id)===key);if(!key||!row)return res.status(400).json({error:'Serviço econômico inválido.'});
  const body=req.body&&typeof req.body==='object'?req.body:{};const effect=body.effect&&typeof body.effect==='object'&&!Array.isArray(body.effect)?body.effect:null;if(!effect)return res.status(400).json({error:'Efeito precisa ser um objeto JSON.'});if(JSON.stringify(effect).length>6000)return res.status(400).json({error:'Efeito muito grande.'});
  const duration=Math.round(clampNum(body.duration_ms,60000,86400000,row.duration_ms||3600000)),maxStack=Math.round(clampNum(body.max_stack_ms,60000,604800000,row.max_stack_ms||21600000));
  const {data,error}=await req.sb.rpc('admin_update_economy_service_v1815',{p_service_id:key,p_base_cost:Math.round(clampNum(body.base_cost,0,1000000000000,row.base_cost||0)),p_duration_ms:duration,p_level_cost_scale:clampNum(body.level_cost_scale,0,10,row.level_cost_scale||0),p_max_stack_ms:maxStack,p_effect:effect,p_enabled:body.enabled!==false});if(error){const msg=String(error.message||'Falha ao salvar serviço econômico.');return res.status(/administrativ|permiss|negado/i.test(msg)?403:400).json({error:msg});}
  const runtime=await refreshSystemsRuntimeSnapshot(true);res.set('Cache-Control','no-store');res.json({ok:true,service_id:key,runtime,saved:data||null});
}));
app.post('/api/admin/runtime/systems/crafting/:recipeId', requireUser, asyncRoute(async(req,res)=>{
  const key=safeWorldId(req.params?.recipeId);const current=await loadSystemsRuntimeSnapshot(false);const row=current?.crafting_recipes?.find(x=>String(x.recipe_id)===key);if(!key||!row)return res.status(400).json({error:'Receita inválida.'});
  const body=req.body&&typeof req.body==='object'?req.body:{},ingredients=body.ingredients&&typeof body.ingredients==='object'&&!Array.isArray(body.ingredients)?body.ingredients:null,grantPayload=body.grant_payload&&typeof body.grant_payload==='object'&&!Array.isArray(body.grant_payload)?body.grant_payload:null;if(!ingredients||!grantPayload)return res.status(400).json({error:'Ingredientes e recompensa precisam ser objetos JSON.'});if(JSON.stringify(ingredients).length>8000||JSON.stringify(grantPayload).length>8000)return res.status(400).json({error:'JSON da receita muito grande.'});
  const currency=String(body.currency||row.currency||'credits')==='uridium'?'uridium':'credits',output=String(body.output_label||'').trim().slice(0,72);if(!output)return res.status(400).json({error:'Informe a saída da receita.'});
  const {data,error}=await req.sb.rpc('admin_update_crafting_recipe_v1815',{p_recipe_id:key,p_cost:Math.round(clampNum(body.cost,0,1000000000000,row.cost||0)),p_currency:currency,p_ingredients:ingredients,p_grant_payload:grantPayload,p_output_label:output,p_min_level:Math.round(clampNum(body.min_level,1,100,row.min_level||1)),p_enabled:body.enabled!==false});if(error){const msg=String(error.message||'Falha ao salvar receita.');return res.status(/administrativ|permiss|negado/i.test(msg)?403:400).json({error:msg});}
  const runtime=await refreshSystemsRuntimeSnapshot(true);res.set('Cache-Control','no-store');res.json({ok:true,recipe_id:key,runtime,saved:data||null});
}));

app.get('/api/runtime/systems', requireUser, asyncRoute(async (req,res)=>{
  const snapshot=await loadSystemsRuntimeSnapshot(Boolean(req.query?.refresh));
  res.set('Cache-Control','no-store');
  res.json(snapshot);
}));

app.get('/api/runtime/pass', requireUser, asyncRoute(async (req,res)=>{
  const snapshot=await loadPassRuntimeSnapshot(Boolean(req.query?.refresh));
  res.set('Cache-Control','no-store');res.json(snapshot);
}));
app.post('/api/admin/runtime/pass/seasons/:seasonKey', requireUser, asyncRoute(async(req,res)=>{
  const key=String(req.params?.seasonKey||'').trim().slice(0,32),current=await loadPassRuntimeSnapshot(false),row=current?.seasons?.find(x=>String(x.season_key)===key);if(!key||!row)return res.status(400).json({error:'Temporada inválida.'});
  const body=req.body&&typeof req.body==='object'?req.body:{},startsAt=body.starts_at?new Date(body.starts_at):null,endsAt=body.ends_at?new Date(body.ends_at):null;if(startsAt&&Number.isNaN(startsAt.getTime()))return res.status(400).json({error:'Início da temporada inválido.'});if(endsAt&&Number.isNaN(endsAt.getTime()))return res.status(400).json({error:'Fim da temporada inválido.'});
  const {data,error}=await req.sb.rpc('admin_update_battle_pass_season_v1817b',{p_season_key:key,p_name:String(body.name||row.name||'').trim().slice(0,80),p_description:String(body.description??row.description??'').trim().slice(0,240),p_starts_at:startsAt?startsAt.toISOString():null,p_ends_at:endsAt?endsAt.toISOString():null,p_tier_count:Math.round(clampNum(body.tier_count,1,100,row.tier_count||30)),p_points_per_tier:Math.round(clampNum(body.points_per_tier,1,1000000,row.points_per_tier||500)),p_daily_points:Math.round(clampNum(body.daily_points,1,100000,row.daily_points||100)),p_premium_price_brl:clampNum(body.premium_price_brl,0,99999,row.premium_price_brl||19.9),p_enabled:body.enabled!==false});if(error){const msg=String(error.message||'Falha ao salvar temporada.');return res.status(/administrativ|permiss|negado/i.test(msg)?403:400).json({error:msg});}
  const runtime=await refreshPassRuntimeSnapshot(true);res.set('Cache-Control','no-store');res.json({ok:true,season_key:key,runtime,saved:data||null});
}));
app.post('/api/admin/runtime/pass/seasons/:seasonKey/tiers/:tierNo', requireUser, asyncRoute(async(req,res)=>{
  const key=String(req.params?.seasonKey||'').trim().slice(0,32),tierNo=Math.round(clampNum(req.params?.tierNo,1,100,0)),current=await loadPassRuntimeSnapshot(false),season=current?.seasons?.find(x=>String(x.season_key)===key);if(!key||!tierNo||!season||tierNo>Number(season.tier_count||100))return res.status(400).json({error:'Tier inválido.'});
  const body=req.body&&typeof req.body==='object'?req.body:{};if(!body.free_reward||typeof body.free_reward!=='object'||Array.isArray(body.free_reward))return res.status(400).json({error:'Recompensa Free precisa ser um objeto JSON.'});if(!body.premium_reward||typeof body.premium_reward!=='object'||Array.isArray(body.premium_reward))return res.status(400).json({error:'Recompensa Premium precisa ser um objeto JSON.'});
  const {data,error}=await req.sb.rpc('admin_update_battle_pass_tier_v1817b',{p_season_key:key,p_tier_no:tierNo,p_free_reward:sanitizePassReward(body.free_reward),p_premium_reward:sanitizePassReward(body.premium_reward),p_enabled:body.enabled!==false});if(error){const msg=String(error.message||'Falha ao salvar tier.');return res.status(/administrativ|permiss|negado/i.test(msg)?403:400).json({error:msg});}
  const runtime=await refreshPassRuntimeSnapshot(true);res.set('Cache-Control','no-store');res.json({ok:true,season_key:key,tier_no:tierNo,runtime,saved:data||null});
}));

// V18.1.7C — Lojas Comum + Premium Data Driven
app.get('/api/runtime/shops', requireUser, asyncRoute(async(req,res)=>{
  const snapshot=await loadShopsRuntimeSnapshot(Boolean(req.query?.refresh));
  res.set('Cache-Control','no-store');res.json(snapshot);
}));
app.post('/api/admin/runtime/shops/common/:catalogKey', requireUser, asyncRoute(async(req,res)=>{
  const key=String(req.params?.catalogKey||'').trim().slice(0,120),current=await loadShopsRuntimeSnapshot(false),row=current?.common?.find(x=>String(x.catalog_key)===key);if(!key||!row)return res.status(400).json({error:'Produto da Loja Comum inválido.'});
  const body=req.body&&typeof req.body==='object'?req.body:{},currency=String(body.currency||row.currency||'credits')==='uridium'?'uridium':'credits',tab=COMMON_SHOP_TABS.has(String(body.shop_tab||''))?String(body.shop_tab):String(row.shop_tab||'');if(!COMMON_SHOP_TABS.has(tab))return res.status(400).json({error:'Aba da Loja inválida.'});
  const {data,error}=await req.sb.rpc('admin_update_common_shop_item_v1817c',{
    p_catalog_key:key,p_display_name:String(body.display_name??row.display_name??'').trim().slice(0,100),p_description:String(body.description??row.description??'').trim().slice(0,300),
    p_price:Math.round(clampNum(body.price,0,1000000000000,row.price||0)),p_currency:currency,p_quantity:Math.round(clampNum(body.quantity,1,10000000,row?.meta?.grant?.qty||1)),
    p_min_level:Math.round(clampNum(body.min_level,1,100,row.min_level||1)),p_sort_order:Math.round(clampNum(body.sort_order,0,9999,row.sort_order||100)),p_shop_tab:tab,
    p_shop_visible:body.shop_visible!==false,p_enabled:body.enabled!==false
  });
  if(error){const msg=String(error.message||'Falha ao salvar produto da Loja Comum.');return res.status(/administrativ|permiss|negado/i.test(msg)?403:400).json({error:msg});}
  const runtime=await refreshShopsRuntimeSnapshot(true);await loadLiveOpsSnapshot(true).catch(()=>null);res.set('Cache-Control','no-store');res.json({ok:true,catalog_key:key,runtime,saved:data||null});
}));
app.post('/api/admin/runtime/shops/premium/:productId', requireUser, asyncRoute(async(req,res)=>{
  const key=String(req.params?.productId||'').trim().slice(0,80),current=await loadShopsRuntimeSnapshot(false),row=current?.premium?.find(x=>String(x.id)===key);if(!key||!row)return res.status(400).json({error:'Produto Premium inválido.'});
  const body=req.body&&typeof req.body==='object'?req.body:{};
  const {data,error}=await req.sb.rpc('admin_update_premium_shop_item_v1817c',{
    p_product_id:key,p_name:String(body.name??row.name??'').trim().slice(0,100),p_description:String(body.description??row.description??'').trim().slice(0,300),
    p_price_brl:row.category==='battle_pass'?null:clampNum(body.price_brl,0,99999,row.price_brl||0),p_quantity:Math.round(clampNum(body.quantity,1,10000000,row.quantity||1)),
    p_min_level:Math.round(clampNum(body.min_level,1,100,row.min_level||1)),p_sort_order:Math.round(clampNum(body.sort_order,0,9999,row.sort_order||100)),p_active:body.active!==false,
    p_days:row.category==='premium'?Math.round(clampNum(body.days,1,3650,row?.meta?.days||30)):null
  });
  if(error){const msg=String(error.message||'Falha ao salvar produto Premium.');return res.status(/administrativ|permiss|negado/i.test(msg)?403:400).json({error:msg});}
  const runtime=await refreshShopsRuntimeSnapshot(true);res.set('Cache-Control','no-store');res.json({ok:true,product_id:key,runtime,saved:data||null});
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
  const access=await accountAccessState(authed);
  if(access?.is_banned||access?.allowed===false)return bannedResponse(res,access);
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
  const access=await accountAccessState(authed);
  if(access?.is_banned||access?.allowed===false)return bannedResponse(res,access);
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


// V18.1.7A — calendário de eventos administrável. Não altera Passe/Lojas nesta etapa.
app.post('/api/admin/runtime/events/:eventKey', requireUser, asyncRoute(async(req,res)=>{
  const key=safeWorldId(req.params?.eventKey),current=await loadLiveOpsSnapshot(false),row=current?.events?.find(x=>String(x.event_key)===key);
  if(!key||!row)return res.status(400).json({error:'Evento inválido.'});
  const body=req.body&&typeof req.body==='object'?req.body:{},mode=['interval','weekly','once'].includes(String(body.schedule_mode))?String(body.schedule_mode):String(row.schedule_mode||'interval');
  const weekdays=[...new Set((Array.isArray(body.weekdays)?body.weekdays:[]).map(Number).filter(n=>Number.isInteger(n)&&n>=0&&n<=6))].sort((a,b)=>a-b);
  const localTime=String(body.start_local_time||'').trim();
  if(mode==='weekly'&&(!weekdays.length||!/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(localTime)))return res.status(400).json({error:'Agenda semanal precisa de pelo menos um dia e horário HH:MM.'});
  const parseIso=(value)=>{if(value==null||value==='')return null;const d=new Date(value);return Number.isNaN(d.getTime())?null:d.toISOString();};
  const startsAt=parseIso(body.starts_at)||row.starts_at||null,endsAt=parseIso(body.ends_at),clearEnds=body.ends_at===''||body.clear_ends_at===true;
  if((mode==='interval'||mode==='once')&&!startsAt)return res.status(400).json({error:'Informe a data/hora inicial do evento.'});
  const {data,error}=await req.sb.rpc('admin_update_live_event_schedule_v1817a',{
    p_event_key:key,p_enabled:body.enabled!==false,p_schedule_mode:mode,p_starts_at:startsAt,
    p_duration_minutes:Math.round(clampNum(body.duration_minutes,1,10080,row.duration_minutes||15)),
    p_repeat_minutes:Math.round(clampNum(body.repeat_minutes,1,10080,row.repeat_minutes||75)),
    p_weekdays:mode==='weekly'?weekdays:(Array.isArray(row.weekdays)?row.weekdays:[]),
    p_start_local_time:mode==='weekly'?localTime:(row.start_local_time||null),p_ends_at:endsAt,p_clear_ends_at:clearEnds
  });
  if(error){const msg=String(error.message||'Falha ao salvar agenda do evento.');return res.status(/administrativ|permiss|negado/i.test(msg)?403:400).json({error:msg});}
  const runtime=await loadLiveOpsSnapshot(true);try{await sharedUniverse.refreshLiveOps(true);}catch{}
  res.set('Cache-Control','no-store');res.json({ok:true,event_key:key,runtime,saved:data||null});
}));

// V18.2.1 — cupons cadastrados exclusivamente no Supabase.
// A autenticação do jogo é obrigatória e os prêmios são transacionados pelo PostgreSQL.
app.post('/api/coupons/redeem', requireUser, asyncRoute(async (req,res)=>{
  const code=String(req.body?.code||'').trim().toUpperCase();
  if(!/^[A-Z0-9][A-Z0-9_-]{3,63}$/.test(code))return res.status(400).json({error:'Formato de cupom inválido.'});
  const result=await withPurchaseLock(req.user.id,async()=>{
    const {data,error}=await req.sb.rpc('redeem_game_coupon_v1821',{p_code:code});
    if(error){console.warn('[coupon] rejected',error.code||'',error.message||'');throw Object.assign(new Error(String(error.message||'Cupom recusado pelo servidor.')),{status:400});}
    return data;
  });
  res.set('Cache-Control','no-store');
  return res.json(result);
}));

app.post('/api/live/purchase', requireUser, asyncRoute(async (req,res)=>{
  const catalogKey=String(req.body?.catalog_key||'').trim().slice(0,120);
  if(!catalogKey)return res.status(400).json({error:'Produto inválido.'});
  const result=await withPurchaseLock(req.user.id,async()=>{
    const snapshot=await loadLiveOpsSnapshot(true);
    const row=liveCatalogRow(snapshot,catalogKey);
    if(!row||row.shop_visible===false)throw Object.assign(new Error('Produto indisponível na Loja.'),{status:404});
    const {data:saveRow,error:saveError}=await req.sb.from('game_saves').select('state').eq('user_id',req.user.id).maybeSingle();
    if(saveError)throw new Error(saveError.message);
    if(!saveRow?.state)throw Object.assign(new Error('Save online ainda não foi criado.'),{status:409});
    const playerLevel=Math.max(1,Math.floor(Number(saveRow.state?.profile?.level)||1));
    const minLevel=Math.max(1,Math.floor(Number(row.min_level)||1));
    if(playerLevel<minLevel)throw Object.assign(new Error(`Requer nível ${minLevel}.`),{status:409});
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
    // Não avance clientSavedAt em mutações econômicas: esse timestamp pertence ao snapshot do cliente.
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





const BASE_SERVICES_V1783={
  weapon:{name:'Calibração de Armamento',description:'+3% dano laser por 60 minutos.',base_cost:1500000,duration_ms:3600000,level_band_size:5,level_cost_scale:.35,max_stack_ms:21600000,effect:{laser_damage_pct:3},enabled:true},
  shield:{name:'Harmonização de Escudo',description:'+5% escudo máximo por 60 minutos.',base_cost:1000000,duration_ms:3600000,level_band_size:5,level_cost_scale:.35,max_stack_ms:21600000,effect:{shield_pct:5},enabled:true},
  cargo:{name:'Otimização de Porão',description:'+750 capacidade de carga por 60 minutos.',base_cost:750000,duration_ms:3600000,level_band_size:5,level_cost_scale:.35,max_stack_ms:21600000,effect:{cargo_flat:750},enabled:true},
  thruster:{name:'Ajuste de Propulsão',description:'+5 velocidade por 60 minutos.',base_cost:1000000,duration_ms:3600000,level_band_size:5,level_cost_scale:.35,max_stack_ms:21600000,effect:{speed_flat:5},enabled:true}
};
const CRAFT_RECIPES_V1782={
  prometid_batch:{name:'Ferrite Refinada',description:'Comprime minérios básicos em Ferrite.',cost:200000,currency:'credits',ingredients:{Prometium:220,Endurium:120,Terbium:80},grant_payload:{kind:'resource',id:'Prometid',qty:30},output_label:'30 Ferrite',min_level:1,enabled:true},
  duranium_batch:{name:'Duracite Refinada',description:'Liga estrutural de média densidade.',cost:400000,currency:'credits',ingredients:{Endurium:140,Terbium:140,Prometid:20},grant_payload:{kind:'resource',id:'Duranium',qty:20},output_label:'20 Duracite',min_level:1,enabled:true},
  promerium_batch:{name:'Solarium Refinado',description:'Material raro para receitas avançadas.',cost:1500000,currency:'credits',ingredients:{Prometid:35,Duranium:35,Xenomit:3},grant_payload:{kind:'resource',id:'Promerium',qty:5},output_label:'5 Solarium',min_level:1,enabled:true},
  ammo_pls2:{name:'Lote PLS-2',description:'Produção de munição usando ligas refinadas.',cost:750000,currency:'credits',ingredients:{Prometid:25,Duranium:25,Promerium:1},grant_payload:{kind:'ammo',id:'mcb25',qty:1500},output_label:'1.500 PLS-2',min_level:1,enabled:true},
  rocket_pack:{name:'Lote R-2026',description:'Mísseis intermediários produzidos na base.',cost:500000,currency:'credits',ingredients:{Duranium:20,Promerium:1},grant_payload:{kind:'rocket',id:'plt2026',qty:100},output_label:'100 R-2026',min_level:1,enabled:true},
  repair_bonus:{name:'Carga de Nanorreparo',description:'Converte recursos em 1 Bônus de Reparo.',cost:1000000,currency:'credits',ingredients:{Prometium:40,Endurium:40,Duranium:20},grant_payload:{kind:'repair',qty:1},output_label:'1 Bônus de Reparo',min_level:1,enabled:true}
};
function runtimeServiceDef(runtime,id){const rows=Array.isArray(runtime?.economy_services)?runtime.economy_services:null;if(rows){const hit=rows.find(x=>x.service_id===id);return hit?(hit.enabled===false?null:hit):null;}return BASE_SERVICES_V1783[id]||null;}
function runtimeCraftDef(runtime,id){const rows=Array.isArray(runtime?.crafting_recipes)?runtime.crafting_recipes:null;if(rows){const hit=rows.find(x=>x.recipe_id===id);return hit?(hit.enabled===false?null:hit):null;}return CRAFT_RECIPES_V1782[id]||null;}
function activateBaseServiceServer(state,id,runtime){
  const def=runtimeServiceDef(runtime,id);if(!def)throw Object.assign(new Error('Serviço inexistente ou desativado.'),{status:404});const mapOk=String(state.mapId||'')==='x1'&&String(state.territoryFaction||state.profile?.faction||'')===String(state.profile?.faction||'');if(!mapOk)throw Object.assign(new Error('Serviço disponível somente na sua base X-1.'),{status:409});
  const lv=Math.max(1,Number(state.profile?.level)||1),bandSize=Math.max(1,Number(def.level_band_size)||5),band=Math.floor((lv-1)/bandSize),scale=Math.max(0,Number(def.level_cost_scale)||0),base=Math.max(0,Number(def.base_cost??def.baseCost)||0),cost=Math.round(base*(1+band*scale));debitServer(state,cost,'credits');
  state.economyBoosts ||= {};const now=Date.now(),current=Math.max(now,Number(state.economyBoosts[id])||0),duration=Math.max(60000,Number(def.duration_ms??def.duration)||3600000),cap=now+Math.max(duration,Number(def.max_stack_ms)||21600000);state.economyBoosts[id]=Math.min(cap,current+duration);return {cost,expires_at:state.economyBoosts[id],duration_ms:duration};
}
function applyCraftRecipeServer(state,recipeId,runtime){
  const recipe=runtimeCraftDef(runtime,recipeId);if(!recipe)throw Object.assign(new Error('Receita inexistente ou desativada.'),{status:404});const mapOk=String(state.mapId||'')==='x1'&&String(state.territoryFaction||state.profile?.faction||'')===String(state.profile?.faction||'');if(!mapOk)throw Object.assign(new Error('Refinaria disponível somente na sua base X-1.'),{status:409});
  const level=Math.max(1,Number(state.profile?.level)||1),minLevel=Math.max(1,Number(recipe.min_level)||1);if(level<minLevel)throw Object.assign(new Error(`Receita libera no nível ${minLevel}.`),{status:409});state.cargo ||= {};for(const [id,qty] of Object.entries(recipe.ingredients||{})){const have=Math.max(0,Math.floor(Number(state.cargo[id])||0));if(have<qty)throw Object.assign(new Error(`Recursos insuficientes: ${id}.`),{status:409});}
  const currency=String(recipe.currency)==='uridium'?'uridium':'credits',cost=Math.max(0,Number(recipe.cost)||0);debitServer(state,cost,currency);for(const [id,qty] of Object.entries(recipe.ingredients||{})){state.cargo[id]=Math.max(0,Math.floor(Number(state.cargo[id])||0)-qty);if(state.cargo[id]<=0)delete state.cargo[id];}
  const g=recipe.grant_payload||recipe.grant||{};if(g.kind==='resource')state.cargo[g.id]=(Number(state.cargo[g.id])||0)+g.qty;else if(g.kind==='ammo'){state.ammo ||= {};state.ammo[g.id]=(Number(state.ammo[g.id])||0)+g.qty;}else if(g.kind==='rocket'){state.rockets ||= {};state.rockets[g.id]=(Number(state.rockets[g.id])||0)+g.qty;}else if(g.kind==='repair'){state.galaxyGate ||= {};state.galaxyGate.repairBonus=Math.max(0,Number(state.galaxyGate.repairBonus)||0)+g.qty;}return {...recipe,currency,cost,output_label:recipe.output_label||recipe.label};
}

app.post('/api/economy/action', requireUser, asyncRoute(async (req,res)=>{
  const routeStarted=Date.now();
  const action=String(req.body?.action||'').trim();
  const payload=(req.body?.payload&&typeof req.body.payload==='object')?req.body.payload:{};
  if(!action)return res.status(400).json({error:'Ação econômica ausente.'});
  const result=await withPurchaseLock(req.user.id,async()=>{
    const catalogActions=new Set(['auto_buy','unlock_pet_slot','buy_quantum_cores','sell_cargo','sell_inventory','sell_drone','gate_life','gate_spin']);
    const premiumActions=new Set(['auto_buy','gate_spin']);
    const systemsActions=new Set(['base_service','craft_recipe']);
    const [snapshot,state,premiumResult,systemsSnapshot]=await Promise.all([
      catalogActions.has(action)?loadLiveOpsSnapshot(false):Promise.resolve(null),
      readEconomySave(req),
      premiumActions.has(action)?req.sb.rpc('get_premium_shop_v12'):Promise.resolve({data:null,error:null}),
      systemsActions.has(action)?loadSystemsRuntimeSnapshot(false).catch(()=>null):Promise.resolve(null)
    ]);
    if(premiumResult?.error)throw new Error(premiumResult.error.message);
    const premium=!!premiumResult?.data?.premium_active;
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
      const key=kind==='laser'?'laserSlotsUnlocked':'shieldSlotsUnlocked',listKey=kind==='laser'?'lasers':'shields',current=Math.max(kind==='shield'?2:1,Number(pet[key])||(kind==='shield'?2:1)),next=current+1,level=Math.max(1,Math.min(20,Number(pet.level)||1)),capacity=petSlotCapacityServer(kind,level);if(next>capacity)throw Object.assign(new Error(`Nível ${level}: limite atual de ${capacity} slots de ${kind==='laser'?'laser':'escudo'}.`),{status:409});
      const row=liveCatalogRow(snapshot,`pet_slot:${next}`);if(!row)throw Object.assign(new Error('Preço do slot não está publicado no LIVE OPS.'),{status:404});const cost=Math.max(0,Math.round(Number(row.price)||0));debitServer(state,cost,'uridium');pet[key]=next;pet[listKey]=Array.isArray(pet[listKey])?pet[listKey]:[];while(pet[listKey].length<next)pet[listKey].push(null);info={action,kind,slot:next,cost,currency:'uridium'};
    }
    else if(action==='buy_quantum_cores'){
      const qty=Math.max(1,Math.min(500,Math.floor(Number(payload.qty)||1))),row=liveCatalogRow(snapshot,'quantum_core:unit');if(!row)throw Object.assign(new Error('Núcleos Quânticos indisponíveis no LIVE OPS.'),{status:404});const unit=Math.max(0,Math.round(Number(row.price)||0)),cost=unit*qty;debitServer(state,cost,'uridium');state.pilotBio ||= {};state.pilotBio.logDisks=Math.max(0,Number(state.pilotBio.logDisks)||0)+qty;info={action,qty,unit_price:unit,cost,currency:'uridium'};
    }
    else if(action==='convert_pilot_point'){
      state.pilotBio ||= {};const p=state.pilotBio;p.logDisks=Math.max(0,Math.floor(Number(p.logDisks)||0));p.totalPoints=Math.max(0,Math.floor(Number(p.totalPoints)||0));if(p.totalPoints>=50)throw Object.assign(new Error('Limite de 50 Pontos de Pesquisa atingido.'),{status:409});const next=p.totalPoints+1,cost=Math.max(30,Math.round(30*Math.pow(1.1,Math.max(0,next-1))));if(p.logDisks<cost)throw Object.assign(new Error(`Faltam ${cost-p.logDisks} Núcleos Quânticos.`),{status:409});p.logDisks-=cost;p.totalPoints=next;info={action,point:next,cost,remaining_cores:p.logDisks};
    }
    else if(action==='base_service'){
      const serviceId=String(payload.service_id||'').slice(0,40),svc=activateBaseServiceServer(state,serviceId,systemsSnapshot);info={action,service_id:serviceId,cost:svc.cost,currency:'credits',expires_at:svc.expires_at,duration_ms:svc.duration_ms};
    }
    else if(action==='craft_recipe'){
      const recipeId=String(payload.recipe_id||'').slice(0,64),recipe=applyCraftRecipeServer(state,recipeId,systemsSnapshot);info={action,recipe_id:recipeId,cost:recipe.cost,currency:recipe.currency,ingredients:recipe.ingredients,output:recipe.output_label};
    }
    else if(action==='sell_cargo'){
      const id=String(payload.resource_id||'all'),mapOk=String(state.mapId||'')==='x1'&&String(state.territoryFaction||state.profile?.faction||'')===String(state.profile?.faction||'');if(!mapOk)throw Object.assign(new Error('Trader disponível somente na sua base X-1.'),{status:409});state.cargo ||= {};let total=0;const sold={};const ids=id==='all'?Object.keys(state.cargo):[id];
      const worldCfg=await loadWorldRuntimeSnapshot(false).catch(()=>null);const resourceRows=new Map((worldCfg?.resources||[]).map(r=>[String(r.resource_key||''),r]));
      for(const rid of ids){const qty=Math.max(0,Math.floor(Number(state.cargo[rid])||0));if(!qty||rid==='Xenomit')continue;const runtimeRow=resourceRows.get(rid);let unit=runtimeRow&&runtimeRow.enabled!==false?Math.max(0,Math.round(Number(runtimeRow.sell_price)||0)):0;if(!worldCfg){const row=liveCatalogRow(snapshot,`resource:${rid}`);if(row&&String(row?.meta?.mode||'sell')==='sell')unit=Math.max(0,Math.round(Number(row.price)||0));}if(!unit)continue;total+=qty*unit;sold[rid]={qty,unit,total:qty*unit};delete state.cargo[rid];}
      if(total<=0)throw Object.assign(new Error('Nada vendável no porão.'),{status:409});creditServer(state,total,'credits');info={action,sold,total,currency:'credits',price_source:worldCfg?'world_runtime':'live_ops_fallback'};
    }
    else if(action==='sell_inventory'){
      const itemId=String(payload.item_id||''),qty=Math.max(1,Math.min(999,Math.floor(Number(payload.qty)||1)));state.inventory ||= {};const have=Math.max(0,Math.floor(Number(state.inventory[itemId])||0));if(!itemId||have<qty)throw Object.assign(new Error('Item não disponível no inventário online.'),{status:409});const row=catalogSellRow(snapshot,itemId);if(!row)throw Object.assign(new Error('Esse item não possui preço online para venda.'),{status:404});const unit=Math.max(1,Math.floor((Number(row.price)||0)*.5)),total=unit*qty,currency=String(row.currency)==='uridium'?'uridium':'credits';state.inventory[itemId]=have-qty;if(state.inventory[itemId]<=0)delete state.inventory[itemId];creditServer(state,total,currency);info={action,item_id:itemId,qty,unit,total,currency};
    }
    else if(action==='sell_drone'){
      const droneId=String(payload.drone_id||''),drones=Array.isArray(state.drones)?state.drones:[],idx=drones.findIndex(d=>String(d?.id||'')===droneId);if(idx<0)throw Object.assign(new Error('Drone não encontrado no save online.'),{status:404});const drone=drones[idx],row=liveCatalogRow(snapshot,`drone:${String(drone.type||'')}`);if(!row)throw Object.assign(new Error('Drone sem preço online para venda.'),{status:404});state.inventory ||= {};for(const itemId of (Array.isArray(drone.slots)?drone.slots:[]).filter(Boolean))state.inventory[itemId]=(Number(state.inventory[itemId])||0)+1;drones.splice(idx,1);state.drones=drones;const refund=Math.max(1,Math.floor((Number(row.price)||0)*.5)),currency=String(row.currency)==='uridium'?'uridium':'credits';creditServer(state,refund,currency);info={action,drone_id:droneId,drone_type:String(drone.type||''),refund,currency};
    }
    else if(action==='gate_life'){
      const key=String(payload.protocol||'alpha'),def=GATE_SERVER_DEFS[key];if(!def)throw Object.assign(new Error('Portal inválido.'),{status:400});const g=ensureGalaxyGateServer(state),gate=g[key];const mapOk=String(state.mapId||'')==='x1'&&String(state.territoryFaction||state.profile?.faction||'')===String(state.profile?.faction||'');if(!mapOk)throw Object.assign(new Error('Compre vidas do Portal somente na sua base X-1.'),{status:409});if(gate.lives>=def.maxLives)throw Object.assign(new Error(`${def.label} já está no máximo de ${def.maxLives} vidas.`),{status:409});const row=liveCatalogRow(snapshot,`gate_life:${key}`);if(!row)throw Object.assign(new Error('Preço da vida não está publicado no LIVE OPS.'),{status:404});const cost=Math.max(0,Math.round(Number(row.price)||0));debitServer(state,cost,'credits');gate.lives=Math.min(def.maxLives,gate.lives+1);info={action,protocol:key,lives:gate.lives,max_lives:def.maxLives,cost,currency:'credits'};
    }
    else if(action==='gate_life_bonus'){
      const key=String(payload.protocol||'alpha'),def=GATE_SERVER_DEFS[key];if(!def)throw Object.assign(new Error('Portal inválido.'),{status:400});const g=ensureGalaxyGateServer(state),gate=g[key];const mapOk=String(state.mapId||'')==='x1'&&String(state.territoryFaction||state.profile?.faction||'')===String(state.profile?.faction||'');if(!mapOk)throw Object.assign(new Error('Use vidas reserva somente na sua base X-1.'),{status:409});if(gate.lives>=def.maxLives)throw Object.assign(new Error(`${def.label} já está no máximo de ${def.maxLives} vidas.`),{status:409});if((g.lifeBonus||0)<=0)throw Object.assign(new Error('Nenhuma Vida Astral disponível na reserva.'),{status:409});g.lifeBonus--;gate.lives=Math.min(def.maxLives,gate.lives+1);info={action,protocol:key,lives:gate.lives,max_lives:def.maxLives,life_bonus:g.lifeBonus};
    }
    else if(action==='gate_spin'){
      const key=String(payload.protocol||'alpha'),amount=Math.max(1,Math.min(100,Math.floor(Number(payload.amount)||1)));if(!GATE_SERVER_DEFS[key]||![1,5,10,50,100].includes(amount))throw Object.assign(new Error('Sorteio de portal inválido.'),{status:400});if(!gateUnlockedServer(state,key))throw Object.assign(new Error(`${GATE_SERVER_DEFS[key].label} ainda está bloqueado.`),{status:409});const row=liveCatalogRow(snapshot,`gate_spin:${key}`);if(!row)throw Object.assign(new Error('Materializador sem preço publicado no LIVE OPS.'),{status:404});const baseUnit=Math.max(0,Math.round(Number(row.price)||0)),unit=premium?Math.max(1,Math.floor(baseUnit*.90)):baseUnit,cost=unit*amount;debitServer(state,cost,'uridium');const results=[];for(let i=0;i<amount;i++)results.push(rollGateOnceServer(state,key));state.galaxyGate.lastResults=results.slice(-12);info={action,protocol:key,amount,base_unit_price:baseUnit,unit_price:unit,cost,currency:'uridium',results,premium_discount:unit<baseUnit};
    }
    else throw Object.assign(new Error('Ação econômica não reconhecida pelo servidor.'),{status:400});

    const updated_at=await writeEconomySave(req,state);return {state,updated_at,info};
  });
  res.json({ok:true,...result,server_ms:Date.now()-routeStarted});
}));

// ===================== PLAYER TELEMETRY =====================
app.post('/api/telemetry', requireUser, asyncRoute(async(req,res)=>{
  const batch=(req.body&&typeof req.body==='object')?req.body:{};
  const {data,error}=await req.sb.rpc('record_player_telemetry_v1771',{p_batch:batch});
  if(error)return res.status(400).json({error:String(error.message||'Falha ao registrar telemetria.')});
  res.json(data&&typeof data==='object'?data:{ok:true});
}));

// ===================== ADMIN CONTROL PANEL =====================
async function adminRpc(req,res,name,args={}){
  const {data,error}=await req.sb.rpc(name,args);
  if(error){const msg=String(error.message||'Operação administrativa recusada.');const denied=/administrativ|permiss|negado/i.test(msg);return res.status(denied?403:400).json({error:msg});}
  return res.json(data&&typeof data==='object'?data:{ok:true,data});
}
app.get('/api/admin/status', requireUser, asyncRoute(async(req,res)=>adminRpc(req,res,'admin_status_v1763')));
app.get('/api/admin/users', requireUser, asyncRoute(async(req,res)=>adminRpc(req,res,'admin_search_accounts_v1763',{p_query:String(req.query?.q||'').slice(0,120)})));
app.get('/api/admin/actions', requireUser, asyncRoute(async(req,res)=>adminRpc(req,res,'admin_recent_actions_v1763')));
app.get('/api/admin/telemetry', requireUser, asyncRoute(async(req,res)=>adminRpc(req,res,'admin_telemetry_overview_v1771')));
app.get('/api/admin/telemetry/:userId', requireUser, asyncRoute(async(req,res)=>adminRpc(req,res,'admin_player_telemetry_v1771',{p_target_user_id:req.params.userId})));
app.post('/api/admin/users/:userId/ban', requireUser, asyncRoute(async(req,res)=>{
  const minutes=Math.max(0,Math.min(525600,Math.trunc(Number(req.body?.minutes)||0)));
  return adminRpc(req,res,'admin_set_ban_v1763',{p_target_user_id:req.params.userId,p_minutes:minutes,p_reason:String(req.body?.reason||'').slice(0,240)});
}));
app.post('/api/admin/users/:userId/unban', requireUser, asyncRoute(async(req,res)=>adminRpc(req,res,'admin_unban_user_v1763',{p_target_user_id:req.params.userId})));
app.post('/api/admin/users/:userId/reset', requireUser, asyncRoute(async(req,res)=>adminRpc(req,res,'admin_reset_account_v1763',{p_target_user_id:req.params.userId})));
app.delete('/api/admin/users/:userId', requireUser, asyncRoute(async(req,res)=>adminRpc(req,res,'admin_delete_account_v1763',{p_target_user_id:req.params.userId})));

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
  if (error) {
    const stale=String(error.message||'').includes('SAVE_COUPON_STALE');
    return res.status(stale?409:400).json({error:error.message,code:stale?'SAVE_COUPON_STALE':null});
  }

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


// ===================== V17.9.1 BOOTSTRAP-SAFE PLAYER LOCATION =====================
// A posição é crítica para o login, então o navegador fala apenas com o Render e o
// servidor faz a RPC autenticada no Supabase. Falha nessa rota nunca deve bloquear o mundo.
app.get('/api/player/location', requireUser, asyncRoute(async (req,res)=>{
  const {data,error}=await req.sb.rpc('get_my_player_location_v1774');
  if(error)return res.status(400).json({error:String(error.message||'Falha ao carregar posição.')});
  return res.json({location:data||null});
}));
app.post('/api/player/location', requireUser, asyncRoute(async (req,res)=>{
  const b=req.body||{};
  const {data,error}=await req.sb.rpc('save_player_location_v1774',{
    p_map_id:String(b.mapId||'x1'),
    p_territory_faction:b.territoryFaction==null?null:String(b.territoryFaction),
    p_x:Number(b.x||0),p_y:Number(b.y||0),p_angle:Number(b.angle||0),
    p_client_saved_at:Math.max(0,Math.trunc(Number(b.savedAt||Date.now())))
  });
  if(error)return res.status(400).json({error:String(error.message||'Falha ao salvar posição.')});
  return res.json(data||{ok:true});
}));

app.get('/api/world/status', (req, res) => res.json({ ok: true, version: '18.2.2', ...sharedUniverse.stats() }));

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
  loadNpcConfig: async()=>loadNpcRuntimeSnapshot(false),
  loadWorldConfig: async()=>loadWorldRuntimeSnapshot(false),
  loadSystemsConfig: async()=>loadSystemsRuntimeSnapshot(false),
  loadBattleGroup: async (token) => {
    const sb=supabaseForToken(token);if(!sb)return null;
    const {data,error}=await sb.rpc('get_my_battle_group_v179');
    if(error)throw new Error(error.message);
    return data&&typeof data==='object'?data:null;
  },
  authenticate: async (token, gameSessionId) => {
    if (!token || !gameSessionId) throw new Error('Sessão do universo ausente.');
    const base = supabaseBase();
    if (!base) throw new Error('Supabase indisponível.');
    const { data, error } = await base.auth.getUser(token);
    if (error || !data?.user) throw new Error('Sessão inválida.');
    const sb = supabaseForToken(token);
    const access=await accountAccessState(sb);
    if(access?.is_banned||access?.allowed===false)throw new Error('Conta banida.');
    const { data: sessionState, error: sessionError } = await sb.rpc('validate_game_session_v1214', {
      p_session_id: gameSessionId,
      p_touch: true,
    });
    if (sessionError || !sessionState?.valid) throw new Error('Sessão do jogo substituída.');
    const callsign = await ensureProfile(sb, data.user);
    return { user: data.user, callsign, accessToken: token };
  },
});


const topbarRefreshTimer=setInterval(()=>{
  refreshTopbarRuntimeSnapshot(true).catch(err=>console.warn('[topbar-runtime] refresh:',err.message));
},TOPBAR_RUNTIME_CACHE_MS);
topbarRefreshTimer.unref?.();
refreshTopbarRuntimeSnapshot(true).then(cfg=>console.log(`[topbar-runtime] v${cfg.version} cacheado em ${TOPBAR_RUNTIME_FILE}`)).catch(err=>console.warn('[topbar-runtime] bootstrap:',err.message));

const worldRefreshTimer=setInterval(()=>{
  refreshWorldRuntimeSnapshot(true).catch(err=>console.warn('[world-runtime] refresh:',err.message));
},WORLD_RUNTIME_CACHE_MS);
worldRefreshTimer.unref?.();
refreshWorldRuntimeSnapshot(true).then(cfg=>console.log(`[world-runtime] v${cfg.version} cacheado em ${WORLD_RUNTIME_FILE}`)).catch(err=>console.warn('[world-runtime] bootstrap:',err.message));

const npcRefreshTimer=setInterval(()=>{refreshNpcRuntimeSnapshot(true).catch(err=>console.warn('[npc-runtime] refresh:',err.message));},NPC_CONFIG_CACHE_MS);
npcRefreshTimer.unref?.();
refreshNpcRuntimeSnapshot(true).then(cfg=>console.log(`[npc-runtime] v${cfg.version} cacheado em ${NPC_RUNTIME_FILE}`)).catch(err=>console.warn('[npc-runtime] bootstrap:',err.message));

const shopsRefreshTimer=setInterval(()=>{refreshShopsRuntimeSnapshot(true).catch(err=>console.warn('[shops-runtime] refresh:',err.message));},SHOPS_RUNTIME_CACHE_MS);
shopsRefreshTimer.unref?.();
refreshShopsRuntimeSnapshot(true).then(cfg=>console.log(`[shops-runtime] v${cfg.version} cacheado em ${SHOPS_RUNTIME_FILE}`)).catch(err=>console.warn('[shops-runtime] bootstrap:',err.message));

server.listen(port, () => {
  console.log(`Stellar Legacy V18.2.2 :${port}`);
  console.log('Supabase config:', configStatus());
  console.log('Shared Universe: ONLINE');
});
