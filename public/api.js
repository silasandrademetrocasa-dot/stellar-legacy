const SESSION_KEY = 'stellarLegacyV4Session';
let session = null;
let currentUser = null;
let configPromise = null;

async function readJson(res) {
  return res.json().catch(async () => {
    const text = await res.text().catch(() => '');
    return text ? { error: text } : {};
  });
}

async function getConfig() {
  if (!configPromise) {
    configPromise = fetch('/api/config', { cache: 'no-store' })
      .then(async (res) => {
        const body = await readJson(res);
        if (!res.ok) throw new Error(body.error || 'Supabase não configurado.');
        if (!body.supabaseUrl || !body.supabasePublishableKey) throw new Error('Configuração pública do Supabase incompleta.');
        return {
          url: String(body.supabaseUrl).replace(/\/+$/, ''),
          key: String(body.supabasePublishableKey),
        };
      });
  }
  return configPromise;
}

async function supabaseFetch(path, options = {}, withAuth = false) {
  const { url, key } = await getConfig();
  const headers = {
    apikey: key,
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  if (withAuth) {
    if (!session?.access_token) throw new Error('Sessão ausente.');
    headers.Authorization = `Bearer ${session.access_token}`;
  }

  let res;
  try {
    res = await fetch(`${url}${path}`, { ...options, headers });
  } catch (err) {
    throw new Error('Seu navegador não conseguiu conectar ao Supabase. Verifique a internet e tente novamente.');
  }

  const body = await readJson(res);
  if (!res.ok) {
    const msg = body?.msg || body?.message || body?.error_description || body?.error || `Erro ${res.status}`;
    throw new Error(String(msg));
  }
  return body;
}

function setSession(nextSession, user = null) {
  session = nextSession;
  currentUser = user;
  localStorage.setItem(SESSION_KEY, JSON.stringify({ session, user: currentUser }));
}

function sessionFromAuth(body) {
  if (!body?.access_token) return null;
  const now = Math.floor(Date.now() / 1000);
  return {
    access_token: body.access_token,
    refresh_token: body.refresh_token,
    expires_at: body.expires_at || (body.expires_in ? now + Number(body.expires_in) : null),
  };
}

async function upsertProfile(user, callsign = '') {
  if (!user?.id || !session?.access_token) return;
  const preferred = (callsign || user.user_metadata?.callsign || user.email?.split('@')[0] || 'Pilot').slice(0, 24);
  await supabaseFetch('/rest/v1/profiles?on_conflict=id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ id: user.id, callsign: preferred, updated_at: new Date().toISOString() }),
  }, true);
}

export function getSession() { return session; }
export function getUser() { return currentUser; }

export async function signUp({ callsign, email, password }) {
  const body = await supabaseFetch('/auth/v1/signup', {
    method: 'POST',
    body: JSON.stringify({
      email: String(email).trim().toLowerCase(),
      password,
      data: { callsign: String(callsign).trim().slice(0, 24) },
    }),
  });

  const nextSession = sessionFromAuth(body);
  const user = body.user || null;
  if (nextSession && user) {
    setSession(nextSession, {
      id: user.id,
      email: user.email,
      callsign: user.user_metadata?.callsign || callsign,
    });
    await upsertProfile(user, callsign);
  }

  return {
    user: user ? { id: user.id, email: user.email, callsign: user.user_metadata?.callsign || callsign } : null,
    session: nextSession,
    requires_confirmation: !nextSession,
  };
}

export async function signIn({ email, password }) {
  const body = await supabaseFetch('/auth/v1/token?grant_type=password', {
    method: 'POST',
    body: JSON.stringify({ email: String(email).trim().toLowerCase(), password }),
  });
  const nextSession = sessionFromAuth(body);
  if (!nextSession || !body.user) throw new Error('Login inválido.');
  const user = {
    id: body.user.id,
    email: body.user.email,
    callsign: body.user.user_metadata?.callsign || body.user.email?.split('@')[0] || 'Pilot',
  };
  setSession(nextSession, user);
  await upsertProfile(body.user);
  return { user, session: nextSession };
}

export function signOutLocal() {
  session = null;
  currentUser = null;
  localStorage.removeItem(SESSION_KEY);
}

async function refreshSession() {
  if (!session?.refresh_token) return false;
  try {
    const body = await supabaseFetch('/auth/v1/token?grant_type=refresh_token', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: session.refresh_token }),
    });
    const nextSession = sessionFromAuth(body);
    if (!nextSession || !body.user) throw new Error('Sessão não renovada');
    const user = {
      id: body.user.id,
      email: body.user.email,
      callsign: body.user.user_metadata?.callsign || body.user.email?.split('@')[0] || 'Pilot',
    };
    setSession(nextSession, user);
    return true;
  } catch {
    signOutLocal();
    return false;
  }
}

async function authedSupabaseFetch(path, options = {}, retry = true) {
  try {
    return await supabaseFetch(path, options, true);
  } catch (err) {
    const msg = String(err?.message || err);
    const authish = /jwt|token|expired|unauthorized|401/i.test(msg);
    if (retry && authish && await refreshSession()) return authedSupabaseFetch(path, options, false);
    throw err;
  }
}

export async function restoreSession() {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    session = parsed.session || null;
    currentUser = parsed.user || null;
    if (!session?.access_token) throw new Error('Sessão inválida');
    const user = await authedSupabaseFetch('/auth/v1/user');
    currentUser = {
      id: user.id,
      email: user.email,
      callsign: user.user_metadata?.callsign || user.email?.split('@')[0] || 'Pilot',
    };
    setSession(session, currentUser);
    return { session, user: currentUser };
  } catch {
    signOutLocal();
    return null;
  }
}

export async function loadCloudSave() {
  if (!currentUser?.id) throw new Error('Usuário não identificado.');
  const rows = await authedSupabaseFetch(`/rest/v1/game_saves?user_id=eq.${encodeURIComponent(currentUser.id)}&select=state,updated_at&limit=1`);
  const row = Array.isArray(rows) ? rows[0] : null;
  return { state: row?.state || null, updated_at: row?.updated_at || null };
}

export async function saveCloudSave(state) {
  if (!currentUser?.id) throw new Error('Usuário não identificado.');
  const updated_at = new Date().toISOString();
  await authedSupabaseFetch('/rest/v1/game_saves?on_conflict=user_id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ user_id: currentUser.id, state, updated_at }),
  });

  const profile = state.profile || {};
  await authedSupabaseFetch('/rest/v1/profiles?on_conflict=id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({
      id: currentUser.id,
      callsign: String(profile.callsign || currentUser.callsign || 'Pilot').slice(0, 24),
      faction: profile.faction || null,
      level: Number(profile.level || 1),
      xp: Number(profile.xp || 0),
      credits: Number(profile.credits || 0),
      uridium: Number(profile.uridium || 0),
      updated_at,
    }),
  });
  return { ok: true, updated_at };
}
