const SESSION_KEY = 'stellarLegacyV4Session';
let session = null;
let currentUser = null;

async function jsonFetch(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `Erro ${res.status}`);
  return body;
}

export function getSession() { return session; }
export function getUser() { return currentUser; }

export async function signUp({ callsign, email, password }) {
  const data = await jsonFetch('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ callsign, email, password }),
  });
  if (data.session) setSession(data.session, data.user);
  return data;
}

export async function signIn({ email, password }) {
  const data = await jsonFetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  setSession(data.session, data.user);
  return data;
}

export function signOutLocal() {
  session = null;
  currentUser = null;
  localStorage.removeItem(SESSION_KEY);
}

function setSession(nextSession, user = null) {
  session = nextSession;
  currentUser = user;
  localStorage.setItem(SESSION_KEY, JSON.stringify({ session, user: currentUser }));
}

async function refreshSession() {
  if (!session?.refresh_token) return false;
  try {
    const data = await jsonFetch('/api/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: session.refresh_token }),
    });
    setSession(data.session, data.user);
    return true;
  } catch {
    signOutLocal();
    return false;
  }
}

async function authFetch(url, options = {}, retry = true) {
  if (!session?.access_token) throw new Error('Sessão ausente.');
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      ...(options.headers || {}),
    },
  });
  if (res.status === 401 && retry && await refreshSession()) {
    return authFetch(url, options, false);
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `Erro ${res.status}`);
  return body;
}

export async function restoreSession() {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    session = parsed.session || null;
    currentUser = parsed.user || null;
    if (!session?.access_token) throw new Error('Sessão inválida');
    const data = await authFetch('/api/auth/me');
    currentUser = data.user;
    setSession(session, currentUser);
    return { session, user: currentUser };
  } catch {
    signOutLocal();
    return null;
  }
}

export async function loadCloudSave() {
  return authFetch('/api/save');
}

export async function saveCloudSave(state) {
  return authFetch('/api/save', {
    method: 'PUT',
    body: JSON.stringify({ state }),
  });
}
