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

app.get('/health', (req, res) => res.json({ ok: true, game: 'Stellar Legacy', version: '15.0.0', universe: 'shared' }));


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
  version: '15.0.0',
  authReady: Boolean(SUPABASE_URL && SUPABASE_KEY),
  diagnostics: configStatus(),
  features: ['login', 'cloud_save', 'factions', 'safe_zone', 'shop', 'owned_ships', 'equipment_slots', 'inventory', 'drones', 'ammo', 'rockets', 'expanded_expedition_maps', 'cargo_hold', 'ore_trading', 'npc_cargo_boxes', 'npc_respawn', 'minimap_navigation', 'waypoints', 'landmark_discovery', 'combat_fx', 'pet_modules', 'auto_buy_cpu', 'v8_asset_identity', 'mission_control_v93', 'mission_acceptance_tracking', 'expanded_enemy_density', 'online_player_presence', 'real_player_auction', 'rank_nameplates_v12', 'clans_v12', 'clan_vault_v12', 'premium_shop_v12', 'battle_pass_paid_v12', 'premium_subscription_v12', 'clan_daily_economy_v12', 'portal_neutral_zone_v12', 'base_only_equipment_v12', 'single_session_v1214', 'manual_login_v141', 'account_bound_save_v141', 'unique_callsign_v141', 'premium_auto_combat_v141', 'shared_universe_v15', 'authoritative_npcs_v15', 'shared_ores_v15', 'shared_events_v15', 'websocket_world_v15', 'npc_contribution_v15'],
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

app.get('/api/world/status', (req, res) => res.json({ ok: true, version: '15.0.0', ...sharedUniverse.stats() }));

app.get('*', (req, res) => res.sendFile(path.join(__dirname, '../public/index.html')));

app.use((err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.path}`, err);
  if (res.headersSent) return next(err);
  const isFetchError = /fetch failed|ENOTFOUND|ECONNREFUSED|ETIMEDOUT|UND_ERR/i.test(String(err?.message || err));
  const message = isFetchError
    ? 'Falha ao conectar ao Supabase. Confira SUPABASE_URL e a Publishable Key no Render.'
    : 'Erro interno no servidor.';
  res.status(502).json({
    error: message,
    detail: String(err?.message || err).slice(0, 240),
    diagnostics: configStatus(),
  });
});

const port = process.env.PORT || 3000;
const server = http.createServer(app);
const sharedUniverse = attachSharedUniverse(server, {
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
  console.log(`Stellar Legacy V15.0.0 :${port}`);
  console.log('Supabase config:', configStatus());
  console.log('Shared Universe: ONLINE');
});
