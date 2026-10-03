import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

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

async function ensureProfile(sb, user, callsign = '') {
  const preferred = (callsign || user.user_metadata?.callsign || user.email?.split('@')[0] || 'Pilot').slice(0, 24);
  const { error } = await sb.from('profiles').upsert({
    id: user.id,
    callsign: preferred,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'id' });
  if (error) console.warn('profile upsert:', error.message);
}

app.get('/health', (req, res) => res.json({ ok: true, game: 'Stellar Legacy', version: '12.1.4' }));


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
  version: '12.1.4',
  authReady: Boolean(SUPABASE_URL && SUPABASE_KEY),
  diagnostics: configStatus(),
  features: ['login', 'cloud_save', 'factions', 'safe_zone', 'shop', 'owned_ships', 'equipment_slots', 'inventory', 'drones', 'ammo', 'rockets', 'expanded_expedition_maps', 'cargo_hold', 'ore_trading', 'npc_cargo_boxes', 'npc_respawn', 'minimap_navigation', 'waypoints', 'landmark_discovery', 'combat_fx', 'pet_modules', 'auto_buy_cpu', 'v8_asset_identity', 'mission_control_v93', 'mission_acceptance_tracking', 'expanded_enemy_density', 'online_player_presence', 'real_player_auction', 'rank_nameplates_v12', 'clans_v12', 'clan_vault_v12', 'premium_shop_v12', 'battle_pass_paid_v12', 'premium_subscription_v12', 'clan_daily_economy_v12', 'portal_neutral_zone_v12', 'base_only_equipment_v12', 'single_session_v1214'],
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
  if (String(callsign).trim().length < 3) return res.status(400).json({ error: 'O callsign precisa ter pelo menos 3 caracteres.' });
  if (password.length < 6) return res.status(400).json({ error: 'A senha precisa ter pelo menos 6 caracteres.' });
  const sb = supabaseBase();
  if (!sb) return res.status(503).json({ error: 'Supabase não configurado no Render.', diagnostics: configStatus() });

  const { data, error } = await sb.auth.signUp({
    email: String(email).trim().toLowerCase(),
    password,
    options: { data: { callsign: String(callsign).trim().slice(0, 24) } },
  });
  if (error) return res.status(400).json({ error: error.message });

  let gameSession = null;
  if (data.session && data.user) {
    const authed = supabaseForToken(data.session.access_token);
    await ensureProfile(authed, data.user, callsign);
    gameSession = await registerGameSession(authed, req);
  }

  res.json({
    user: data.user ? { id: data.user.id, email: data.user.email, callsign: data.user.user_metadata?.callsign || callsign } : null,
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
  await ensureProfile(authed, data.user);
  const gameSession = await registerGameSession(authed, req);
  res.json({
    user: { id: data.user.id, email: data.user.email, callsign: data.user.user_metadata?.callsign || data.user.email?.split('@')[0] || 'Pilot' },
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
  res.json({
    user: { id: data.user.id, email: data.user.email, callsign: data.user.user_metadata?.callsign || data.user.email?.split('@')[0] || 'Pilot' },
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
  await ensureProfile(req.sb, req.user);
  res.json({ user: { id: req.user.id, email: req.user.email, callsign: req.user.user_metadata?.callsign || req.user.email?.split('@')[0] || 'Pilot' } });
}));

app.get('/api/save', requireUser, asyncRoute(async (req, res) => {
  const { data, error } = await req.sb.from('game_saves').select('state,updated_at').eq('user_id', req.user.id).maybeSingle();
  if (error) return res.status(400).json({ error: error.message });
  res.json({ state: data?.state || null, updated_at: data?.updated_at || null });
}));

app.put('/api/save', requireUser, asyncRoute(async (req, res) => {
  let state = req.body?.state;
  if (!state || typeof state !== 'object') return res.status(400).json({ error: 'Save inválido.' });

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
    callsign: String(profile.callsign || req.user.user_metadata?.callsign || 'Pilot').slice(0, 24),
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
app.listen(port, () => {
  console.log(`Stellar Legacy V12.1.4 :${port}`);
  console.log('Supabase config:', configStatus());
});
