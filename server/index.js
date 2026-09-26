import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || '';

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, '../public')));

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

async function requireUser(req, res, next) {
  const token = bearer(req);
  if (!token) return res.status(401).json({ error: 'Sessão ausente.' });
  const sb = supabaseBase();
  if (!sb) return res.status(503).json({ error: 'Supabase não configurado no servidor.' });
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data?.user) return res.status(401).json({ error: 'Sessão inválida ou expirada.' });
  req.accessToken = token;
  req.user = data.user;
  req.sb = supabaseForToken(token);
  next();
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

app.get('/health', (req, res) => res.json({ ok: true, game: 'Stellar Legacy', version: '4.0.0' }));
app.get('/api/meta', (req, res) => res.json({
  name: 'Stellar Legacy',
  version: '4.0.0',
  authReady: Boolean(SUPABASE_URL && SUPABASE_KEY),
  features: ['login', 'cloud_save', 'factions', 'safe_zone', 'shop', 'owned_ships', 'equipment_slots', 'inventory', 'drones', 'ammo', 'rockets', 'x1_x4_maps'],
}));

app.post('/api/auth/signup', async (req, res) => {
  const { email, password, callsign } = req.body || {};
  if (!email || !password || !callsign) return res.status(400).json({ error: 'Informe callsign, e-mail e senha.' });
  if (password.length < 6) return res.status(400).json({ error: 'A senha precisa ter pelo menos 6 caracteres.' });
  const sb = supabaseBase();
  if (!sb) return res.status(503).json({ error: 'Supabase não configurado no Render.' });
  const { data, error } = await sb.auth.signUp({
    email: String(email).trim().toLowerCase(),
    password,
    options: { data: { callsign: String(callsign).trim().slice(0, 24) } },
  });
  if (error) return res.status(400).json({ error: error.message });
  if (data.session) {
    const authed = supabaseForToken(data.session.access_token);
    await ensureProfile(authed, data.user, callsign);
  }
  res.json({
    user: data.user ? { id: data.user.id, email: data.user.email, callsign: data.user.user_metadata?.callsign || callsign } : null,
    session: data.session ? {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at,
    } : null,
    requires_confirmation: !data.session,
  });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Informe e-mail e senha.' });
  const sb = supabaseBase();
  if (!sb) return res.status(503).json({ error: 'Supabase não configurado no Render.' });
  const { data, error } = await sb.auth.signInWithPassword({ email: String(email).trim().toLowerCase(), password });
  if (error || !data.session) return res.status(401).json({ error: error?.message || 'Login inválido.' });
  const authed = supabaseForToken(data.session.access_token);
  await ensureProfile(authed, data.user);
  res.json({
    user: { id: data.user.id, email: data.user.email, callsign: data.user.user_metadata?.callsign || data.user.email?.split('@')[0] || 'Pilot' },
    session: { access_token: data.session.access_token, refresh_token: data.session.refresh_token, expires_at: data.session.expires_at },
  });
});

app.post('/api/auth/refresh', async (req, res) => {
  const { refresh_token } = req.body || {};
  if (!refresh_token) return res.status(400).json({ error: 'Refresh token ausente.' });
  const sb = supabaseBase();
  if (!sb) return res.status(503).json({ error: 'Supabase não configurado.' });
  const { data, error } = await sb.auth.refreshSession({ refresh_token });
  if (error || !data.session) return res.status(401).json({ error: error?.message || 'Não foi possível renovar a sessão.' });
  res.json({
    user: { id: data.user.id, email: data.user.email, callsign: data.user.user_metadata?.callsign || data.user.email?.split('@')[0] || 'Pilot' },
    session: { access_token: data.session.access_token, refresh_token: data.session.refresh_token, expires_at: data.session.expires_at },
  });
});

app.get('/api/auth/me', requireUser, async (req, res) => {
  await ensureProfile(req.sb, req.user);
  res.json({ user: { id: req.user.id, email: req.user.email, callsign: req.user.user_metadata?.callsign || req.user.email?.split('@')[0] || 'Pilot' } });
});

app.get('/api/save', requireUser, async (req, res) => {
  const { data, error } = await req.sb.from('game_saves').select('state,updated_at').eq('user_id', req.user.id).maybeSingle();
  if (error) return res.status(400).json({ error: error.message });
  res.json({ state: data?.state || null, updated_at: data?.updated_at || null });
});

app.put('/api/save', requireUser, async (req, res) => {
  const state = req.body?.state;
  if (!state || typeof state !== 'object') return res.status(400).json({ error: 'Save inválido.' });
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
    updated_at,
  }, { onConflict: 'id' });

  res.json({ ok: true, updated_at });
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, '../public/index.html')));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Stellar Legacy V4 on :${port}`));
