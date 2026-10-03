const SESSION_KEY = 'stellarLegacyV4Session';
let session = null;
let currentUser = null;
let configPromise = null;
let sessionReplacementNotified = false;

async function readJson(res) {
  return res.json().catch(async () => {
    const text = await res.text().catch(() => '');
    return text ? { error: text } : {};
  });
}

function notifySessionReplaced(message = 'Sua conta foi acessada em outro dispositivo.') {
  if (sessionReplacementNotified) return;
  sessionReplacementNotified = true;
  const userId = currentUser?.id || null;
  signOutLocal();
  try {
    window.dispatchEvent(new CustomEvent('stellar-session-replaced', {
      detail: { message, userId },
    }));
  } catch {}
}

async function serverFetch(path, options = {}, withAuth = false) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  if (withAuth) {
    if (!session?.access_token) throw new Error('Sessão ausente.');
    headers.Authorization = `Bearer ${session.access_token}`;
    if (session?.game_session_id) headers['X-Game-Session-Id'] = session.game_session_id;
  }

  let res;
  try {
    res = await fetch(path, { ...options, headers, cache: 'no-store' });
  } catch {
    throw new Error('Não foi possível conectar ao servidor do jogo. Tente novamente.');
  }

  const body = await readJson(res);
  if (!res.ok) {
    const msg = body?.error || body?.message || `Erro ${res.status}`;
    const err = new Error(String(msg));
    err.status = res.status;
    err.code = body?.code || null;
    if (withAuth && ['SESSION_REPLACED','SESSION_REQUIRED'].includes(err.code)) {
      notifySessionReplaced(String(msg));
    }
    throw err;
  }
  return body;
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
  if (session?.game_session_id) sessionReplacementNotified = false;
  localStorage.setItem(SESSION_KEY, JSON.stringify({ session, user: currentUser }));
}

function sessionFromAuth(body) {
  if (!body?.access_token) return null;
  const now = Math.floor(Date.now() / 1000);
  return {
    access_token: body.access_token,
    refresh_token: body.refresh_token,
    expires_at: body.expires_at || (body.expires_in ? now + Number(body.expires_in) : null),
    game_session_id: body.game_session_id || null,
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
  const body = await serverFetch('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify({
      callsign: String(callsign).trim().slice(0, 24),
      email: String(email).trim().toLowerCase(),
      password,
    }),
  });

  const nextSession = body.session || null;
  const user = body.user || null;
  if (nextSession && user) setSession(nextSession, user);

  return {
    user,
    session: nextSession,
    requires_confirmation: Boolean(body.requires_confirmation),
  };
}

export async function signIn({ email, password }) {
  const body = await serverFetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: String(email).trim().toLowerCase(),
      password,
    }),
  });
  if (!body?.session?.access_token || !body?.user) throw new Error('Login inválido.');
  setSession(body.session, body.user);
  return { user: body.user, session: body.session };
}

export function signOutLocal() {
  session = null;
  currentUser = null;
  localStorage.removeItem(SESSION_KEY);
}

async function refreshSession() {
  if (!session?.refresh_token) return false;
  try {
    const body = await serverFetch('/api/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: session.refresh_token, game_session_id: session.game_session_id }),
    });
    if (!body?.session?.access_token || !body?.user) throw new Error('Sessão não renovada');
    setSession(body.session, body.user);
    return true;
  } catch {
    signOutLocal();
    return false;
  }
}

async function authedServerFetch(path, options = {}, retry = true) {
  try {
    return await serverFetch(path, options, true);
  } catch (err) {
    if (['SESSION_REPLACED','SESSION_REQUIRED'].includes(err?.code)) throw err;
    const authish = err?.status === 401 || /jwt|token|expired|unauthorized|sessão|401/i.test(String(err?.message || err));
    if (retry && authish && await refreshSession()) return authedServerFetch(path, options, false);
    throw err;
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
    if (!session?.access_token || !session?.game_session_id) throw new Error('Sessão antiga; faça login novamente.');
    const body = await authedServerFetch('/api/auth/me');
    currentUser = body.user;
    setSession(session, currentUser);
    return { session, user: currentUser };
  } catch {
    signOutLocal();
    return null;
  }
}

export async function checkGameSession() {
  if (!session?.access_token || !session?.game_session_id) return false;
  const body = await authedServerFetch('/api/auth/session-status', {}, false);
  return Boolean(body?.active);
}

export async function endGameSession() {
  if (!session?.access_token || !session?.game_session_id) {
    signOutLocal();
    return;
  }
  try {
    await authedServerFetch('/api/auth/logout', { method: 'POST', body: '{}' }, false);
  } finally {
    signOutLocal();
  }
}

export async function loadCloudSave() {
  if (!currentUser?.id) throw new Error('Usuário não identificado.');
  const body = await authedServerFetch('/api/save');
  return { state: body?.state || null, updated_at: body?.updated_at || null };
}

export async function saveCloudSave(state) {
  if (!currentUser?.id) throw new Error('Usuário não identificado.');
  return authedServerFetch('/api/save', {
    method: 'PUT',
    body: JSON.stringify({ state }),
  });
}


export async function updateCallsign(callsign) {
  const preferred = String(callsign || '').trim().slice(0, 24);
  if (preferred.length < 3) throw new Error('O nome precisa ter pelo menos 3 caracteres.');
  const user = await authedSupabaseFetch('/auth/v1/user', {
    method: 'PUT',
    body: JSON.stringify({ data: { callsign: preferred } }),
  });
  currentUser = {
    id: user.id,
    email: user.email,
    callsign: user.user_metadata?.callsign || preferred,
  };
  setSession(session, currentUser);
  await authedSupabaseFetch('/rest/v1/profiles?on_conflict=id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ id: currentUser.id, callsign: preferred, updated_at: new Date().toISOString() }),
  });
  return currentUser;
}

export async function updatePassword(password) {
  const value = String(password || '');
  if (value.length < 6) throw new Error('A nova senha precisa ter pelo menos 6 caracteres.');
  await authedSupabaseFetch('/auth/v1/user', {
    method: 'PUT',
    body: JSON.stringify({ password: value }),
  });
  return { ok: true };
}

export async function loadRankings() {
  const rows = await authedSupabaseFetch('/rest/v1/rpc/get_public_rankings', {
    method: 'POST',
    body: JSON.stringify({}),
  });
  return Array.isArray(rows) ? rows : [];
}

export async function loadAuctionBids() {
  if (!currentUser?.id) throw new Error('Usuário não identificado.');
  const rows = await authedSupabaseFetch(`/rest/v1/auction_bids?user_id=eq.${encodeURIComponent(currentUser.id)}&status=eq.active&select=*&order=updated_at.desc`);
  return Array.isArray(rows) ? rows : [];
}

export async function saveAuctionBidOnline({ hourKey, lotRef, userBid, lot }) {
  if (!currentUser?.id) throw new Error('Usuário não identificado.');
  const rows = await authedSupabaseFetch('/rest/v1/auction_bids?on_conflict=user_id,hour_key,lot_ref', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify({
      user_id: currentUser.id,
      hour_key: hourKey,
      lot_ref: lotRef,
      user_bid: Math.max(0, Math.round(Number(userBid) || 0)),
      lot: lot || {},
      status: 'active',
      updated_at: new Date().toISOString(),
    }),
  });
  return Array.isArray(rows) ? rows[0] || null : null;
}

export async function markAuctionBidStatusOnline({ hourKey, lotRef, status }) {
  if (!currentUser?.id) throw new Error('Usuário não identificado.');
  await authedSupabaseFetch(`/rest/v1/auction_bids?user_id=eq.${encodeURIComponent(currentUser.id)}&hour_key=eq.${encodeURIComponent(hourKey)}&lot_ref=eq.${encodeURIComponent(lotRef)}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ status, updated_at: new Date().toISOString() }),
  });
  return { ok: true };
}

export async function loadAuctionMarket(hourKey) {
  const rows = await authedSupabaseFetch('/rest/v1/rpc/get_auction_market', {
    method: 'POST',
    body: JSON.stringify({ p_hour_key: String(hourKey || '') }),
  });
  return Array.isArray(rows) ? rows : [];
}

export async function placeAuctionBidOnline({ hourKey, lotRef, userBid, lot }) {
  const rows = await authedSupabaseFetch('/rest/v1/rpc/place_auction_bid_online', {
    method: 'POST',
    body: JSON.stringify({
      p_hour_key: String(hourKey || ''),
      p_lot_ref: String(lotRef || ''),
      p_user_bid: Math.max(0, Math.round(Number(userBid) || 0)),
      p_lot: lot || {},
    }),
  });
  return Array.isArray(rows) ? rows[0] || null : null;
}

export async function upsertPlayerPresenceOnline(payload) {
  if (!currentUser?.id) throw new Error('Usuário não identificado.');
  await authedSupabaseFetch('/rest/v1/player_presence?on_conflict=user_id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({
      user_id: currentUser.id,
      callsign: String(payload.callsign || currentUser.callsign || 'Pilot').slice(0, 24),
      map_id: String(payload.mapId || 'x1'),
      territory_faction: String(payload.territoryFaction || 'battle'),
      x: Number(payload.x || 0),
      y: Number(payload.y || 0),
      angle: Number(payload.angle || 0),
      ship_id: String(payload.shipId || 'phoenix'),
      faction: payload.faction || null,
      level: Math.max(1, Number(payload.level || 1)),
      hp: Math.max(0, Math.round(Number(payload.hp || 0))),
      max_hp: Math.max(0, Math.round(Number(payload.maxHp || 0))),
      shield: Math.max(0, Math.round(Number(payload.shield || 0))),
      max_shield: Math.max(0, Math.round(Number(payload.maxShield || 0))),
      updated_at: new Date().toISOString(),
    }),
  });
  return { ok: true };
}

export async function loadMapPresenceOnline(mapId, territoryFaction='battle') {
  const rows = await authedSupabaseFetch('/rest/v1/rpc/get_map_presence_v12', {
    method: 'POST',
    body: JSON.stringify({
      p_map_id: String(mapId || 'x1'),
      p_territory_faction: String(territoryFaction || 'battle'),
    }),
  });
  return Array.isArray(rows) ? rows : [];
}

export async function listClansOnline() {
  const rows = await authedSupabaseFetch('/rest/v1/rpc/list_clans_v12', {
    method: 'POST', body: JSON.stringify({}),
  });
  return Array.isArray(rows) ? rows : [];
}

export async function loadMyClanOnline() {
  return authedSupabaseFetch('/rest/v1/rpc/get_my_clan_v12', {
    method: 'POST', body: JSON.stringify({}),
  });
}

export async function createClanOnline({name, tag}) {
  return authedSupabaseFetch('/rest/v1/rpc/create_clan_v12', {
    method: 'POST', body: JSON.stringify({p_name:String(name||''), p_tag:String(tag||'')}),
  });
}

export async function joinClanOnline(clanId) {
  return authedSupabaseFetch('/rest/v1/rpc/join_clan_v12', {
    method: 'POST', body: JSON.stringify({p_clan_id:clanId}),
  });
}

export async function leaveClanOnline() {
  return authedSupabaseFetch('/rest/v1/rpc/leave_clan_v12', {
    method: 'POST', body: JSON.stringify({}),
  });
}

export async function donateClanCreditsOnline(amount) {
  return authedSupabaseFetch('/rest/v1/rpc/donate_clan_credits_v12', {
    method: 'POST', body: JSON.stringify({p_amount:Math.max(0,Math.trunc(Number(amount)||0))}),
  });
}

export async function transferClanCreditsOnline({callsign, amount}) {
  return authedSupabaseFetch('/rest/v1/rpc/transfer_clan_credits_v12', {
    method: 'POST', body: JSON.stringify({p_target_callsign:String(callsign||''),p_amount:Math.max(0,Math.trunc(Number(amount)||0))}),
  });
}

export async function claimClanCreditGrantsOnline() {
  return authedSupabaseFetch('/rest/v1/rpc/claim_clan_credit_grants_v12', {
    method: 'POST', body: JSON.stringify({}),
  });
}


export async function recordClanAlienKillOnline({npcType,isBoss=false}) {
  return authedSupabaseFetch('/rest/v1/rpc/record_clan_alien_kill_v12', {
    method: 'POST', body: JSON.stringify({p_npc_type:String(npcType||''),p_is_boss:!!isBoss}),
  });
}

export async function getPremiumShopOnline() {
  return authedSupabaseFetch('/rest/v1/rpc/get_premium_shop_v12', {
    method: 'POST', body: JSON.stringify({}),
  });
}

export async function testPurchasePremiumOnline(productId) {
  return authedSupabaseFetch('/rest/v1/rpc/test_purchase_premium_v12', {
    method: 'POST', body: JSON.stringify({p_product_id:String(productId||'')}),
  });
}

export async function queuePvpAttackOnline({targetUserId,damage,shieldDrain=false,mapId,territoryFaction}) {
  const rows = await authedSupabaseFetch('/rest/v1/rpc/queue_pvp_attack', {
    method: 'POST',
    body: JSON.stringify({
      p_target_user_id: targetUserId,
      p_damage: Math.max(0,Math.round(Number(damage)||0)),
      p_shield_drain: !!shieldDrain,
      p_map_id: String(mapId||'x1'),
      p_territory_faction: String(territoryFaction||'battle'),
    }),
  });
  return Array.isArray(rows) ? rows[0] || null : null;
}

export async function consumePvpDamageEventsOnline() {
  const rows = await authedSupabaseFetch('/rest/v1/rpc/consume_pvp_damage_events', {
    method: 'POST',
    body: JSON.stringify({}),
  });
  return Array.isArray(rows) ? rows : [];
}


export async function syncArenaProfileOnline(payload) {
  const rows = await authedSupabaseFetch('/rest/v1/rpc/sync_arena_profile', {
    method: 'POST',
    body: JSON.stringify({
      p_callsign: String(payload.callsign || currentUser?.callsign || 'Pilot'),
      p_faction: payload.faction || null,
      p_level: Math.max(1, Math.round(Number(payload.level) || 1)),
      p_ship_id: String(payload.shipId || 'phoenix'),
      p_hp: Math.max(1, Math.round(Number(payload.hp) || 1)),
      p_shield: Math.max(0, Math.round(Number(payload.shield) || 0)),
      p_laser_damage: Math.max(0, Math.round(Number(payload.laserDamage) || 0)),
      p_speed: Math.max(0, Math.round(Number(payload.speed) || 0)),
    }),
  });
  return Array.isArray(rows) ? rows[0] || null : null;
}

export async function loadArenaState() {
  const rows = await authedSupabaseFetch('/rest/v1/rpc/get_arena_state', {
    method: 'POST',
    body: JSON.stringify({}),
  });
  return Array.isArray(rows) ? rows[0] || null : null;
}


export async function loadArenaDailyRewardStatus() {
  const body = await authedSupabaseFetch('/rest/v1/rpc/get_arena_daily_reward_status', {
    method: 'POST',
    body: JSON.stringify({}),
  });
  return Array.isArray(body) ? body[0] || null : body || null;
}

export async function claimArenaDailyReward() {
  const body = await authedSupabaseFetch('/rest/v1/rpc/claim_arena_daily_reward', {
    method: 'POST',
    body: JSON.stringify({}),
  });
  return Array.isArray(body) ? body[0] || null : body || null;
}

export async function loadArenaOpponents() {
  const rows = await authedSupabaseFetch('/rest/v1/rpc/get_arena_opponents', {
    method: 'POST',
    body: JSON.stringify({}),
  });
  return Array.isArray(rows) ? rows : [];
}

export async function loadArenaHistory() {
  const rows = await authedSupabaseFetch('/rest/v1/rpc/get_arena_history', {
    method: 'POST',
    body: JSON.stringify({}),
  });
  return Array.isArray(rows) ? rows : [];
}

export async function arenaAttackOnline(targetUserId) {
  const rows = await authedSupabaseFetch('/rest/v1/rpc/arena_attack_v11', {
    method: 'POST',
    body: JSON.stringify({ p_target_user_id: targetUserId }),
  });
  return Array.isArray(rows) ? rows[0] || null : null;
}

export async function removePlayerPresenceOnline() {
  if (!currentUser?.id) return { ok: true };
  await authedSupabaseFetch(`/rest/v1/player_presence?user_id=eq.${encodeURIComponent(currentUser.id)}`, {
    method: 'DELETE',
    headers: { Prefer: 'return=minimal' },
  });
  return { ok: true };
}

