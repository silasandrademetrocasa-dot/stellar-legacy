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

function notifySessionReplaced(message = 'Sua conta foi acessada em outro dispositivo.', code = 'SESSION_REPLACED') {
  if (sessionReplacementNotified) return;
  sessionReplacementNotified = true;
  const userId = currentUser?.id || null;
  signOutLocal();
  try {
    window.dispatchEvent(new CustomEvent('stellar-session-replaced', {
      detail: { message, userId, code },
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
    if (withAuth && ['SESSION_REPLACED','SESSION_REQUIRED','ACCOUNT_BANNED'].includes(err.code)) {
      notifySessionReplaced(String(msg), err.code);
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
  // V14.1: tokens ficam somente na sessão da aba. Nunca persistimos login entre entradas no site.
  try { sessionStorage.setItem(SESSION_KEY, JSON.stringify({ session, user: currentUser })); } catch {}
  try { localStorage.removeItem(SESSION_KEY); } catch {}
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
export function getSessionCredentials() { return { accessToken: session?.access_token || '', gameSessionId: session?.game_session_id || '' }; }
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

export async function requestPasswordReset(email) {
  const value = String(email || '').trim().toLowerCase();
  if (!value || !value.includes('@')) throw new Error('Informe um e-mail válido.');
  const redirectTo = `${window.location.origin}${window.location.pathname || '/'}?recovery=1`;
  try {
    await supabaseFetch(`/auth/v1/recover?redirect_to=${encodeURIComponent(redirectTo)}`, {
      method: 'POST',
      body: JSON.stringify({ email: value }),
    });
  } catch (err) {
    await supabaseFetch('/auth/v1/recover', {
      method: 'POST',
      body: JSON.stringify({ email: value }),
    });
  }
  return { ok: true };
}

export async function restorePasswordRecoveryFromUrl() {
  const hash = new URLSearchParams(String(window.location.hash || '').replace(/^#/, ''));
  const query = new URLSearchParams(window.location.search || '');
  const type = hash.get('type') || query.get('type');
  const accessToken = hash.get('access_token');
  if (type !== 'recovery' || !accessToken) return null;
  const refreshToken = hash.get('refresh_token') || '';
  const expiresIn = Number(hash.get('expires_in') || 3600);
  session = {
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_at: Math.floor(Date.now() / 1000) + expiresIn,
    game_session_id: null,
  };
  try {
    const user = await supabaseFetch('/auth/v1/user', {}, true);
    currentUser = {
      id: user.id,
      email: user.email,
      callsign: user.user_metadata?.callsign || user.email?.split('@')[0] || 'Pilot',
    };
    setSession(session, currentUser);
    history.replaceState({}, document.title, window.location.pathname || '/');
    return { session, user: currentUser, recovery: true };
  } catch (err) {
    signOutLocal();
    throw new Error('O link de recuperação expirou ou é inválido. Solicite outro e-mail.');
  }
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
  try { sessionStorage.removeItem(SESSION_KEY); } catch {}
  try { localStorage.removeItem(SESSION_KEY); } catch {}
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
  const raw = sessionStorage.getItem(SESSION_KEY);
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
  const preferred = String(callsign || '').trim().replace(/\s+/g, ' ').slice(0, 24);
  if (preferred.length < 3) throw new Error('O nome precisa ter pelo menos 3 caracteres.');
  const body = await authedServerFetch('/api/account/callsign', {
    method: 'PUT',
    body: JSON.stringify({ callsign: preferred }),
  });
  if (!body?.user) throw new Error('Não foi possível confirmar o novo nome.');
  currentUser = body.user;
  setSession(session, currentUser);
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
      pilot_title: String(payload.pilotTitle || 'Piloto Estelar').slice(0, 64),
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

// V17.7.7 • posição autoritativa separada do save econômico.
// Bootstrap-critical: passa pelo próprio servidor do jogo. Isso evita que uma RPC direta
// navegador -> Supabase segure a inicialização do mapa/NPCs quando a rota externa estiver lenta.
export async function savePlayerLocationCheckpointOnline(payload, { keepalive = false } = {}) {
  if (!currentUser?.id) return null;
  return authedServerFetch('/api/player/location', {
    method: 'POST',
    keepalive: Boolean(keepalive),
    body: JSON.stringify({
      mapId: String(payload?.mapId || 'x1'),
      territoryFaction: payload?.territoryFaction == null ? null : String(payload.territoryFaction),
      x: Number(payload?.x || 0),
      y: Number(payload?.y || 0),
      angle: Number(payload?.angle || 0),
      savedAt: Math.max(0, Math.trunc(Number(payload?.savedAt || Date.now()))),
    }),
  }, false);
}

export async function loadPlayerLocationCheckpointOnline() {
  if (!currentUser?.id) return null;
  const body = await authedServerFetch('/api/player/location', {}, false);
  return body?.location ?? body ?? null;
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



// ===================== V13.1 WARFRONT =====================
export async function loadWarfrontStateOnline() {
  return authedSupabaseFetch('/rest/v1/rpc/get_warfront_state_v131', {
    method: 'POST', body: JSON.stringify({}),
  });
}

export async function hitWorldBossOnline(damage) {
  return authedSupabaseFetch('/rest/v1/rpc/hit_world_boss_v131', {
    method: 'POST', body: JSON.stringify({p_damage:Math.max(1,Math.round(Number(damage)||0))}),
  });
}

export async function claimWorldBossRewardOnline() {
  return authedSupabaseFetch('/rest/v1/rpc/claim_world_boss_reward_v131', {
    method: 'POST', body: JSON.stringify({}),
  });
}

export async function declareClanWarOnline(targetClanId) {
  return authedSupabaseFetch('/rest/v1/rpc/declare_clan_war_v131', {
    method: 'POST', body: JSON.stringify({p_target_clan_id:targetClanId}),
  });
}

export async function recordClanWarScoreOnline(points, reason='combat') {
  return authedSupabaseFetch('/rest/v1/rpc/record_clan_war_score_v131', {
    method: 'POST', body: JSON.stringify({p_points:Math.max(1,Math.round(Number(points)||0)),p_reason:String(reason||'combat').slice(0,40)}),
  });
}

// ===================== V16 LIVE OPS =====================
export async function loadLiveOpsOnline(force=false) {
  const suffix=force?'?refresh=1':'';
  return authedServerFetch(`/api/live-ops${suffix}`, {}, false);
}

export async function purchaseLiveCatalogOnline(catalogKey) {
  return authedServerFetch('/api/live/purchase', {
    method: 'POST',
    body: JSON.stringify({ catalog_key: String(catalogKey || '') }),
  }, false);
}


export async function economyActionOnline(action, payload = {}) {
  return authedServerFetch('/api/economy/action', {
    method: 'POST',
    body: JSON.stringify({ action: String(action || ''), payload: payload && typeof payload === 'object' ? payload : {} }),
  }, false);
}



// ===================== V16.2 CHAT DOCK =====================
export async function getChatHistoryOnline({channel='global', recipientCallsign='', limit=60}={}) {
  const rows = await authedSupabaseFetch('/rest/v1/rpc/get_chat_history_v16', {
    method: 'POST',
    body: JSON.stringify({
      p_channel: String(channel || 'global'),
      p_recipient_callsign: recipientCallsign ? String(recipientCallsign).trim().slice(0,24) : null,
      p_limit: Math.max(1, Math.min(100, Math.round(Number(limit)||60))),
    }),
  });
  return Array.isArray(rows) ? rows : rows ? [rows] : [];
}

export async function sendChatMessageOnline({channel='global', body='', recipientCallsign=''}={}) {
  const rows = await authedSupabaseFetch('/rest/v1/rpc/send_chat_message_v16', {
    method: 'POST',
    body: JSON.stringify({
      p_channel: String(channel || 'global'),
      p_body: String(body || '').trim().slice(0,240),
      p_recipient_callsign: recipientCallsign ? String(recipientCallsign).trim().slice(0,24) : null,
    }),
  });
  return Array.isArray(rows) ? rows[0] || null : rows || null;
}


// ===================== V16.3 DRONE DESIGNERS =====================
export async function getMyDesignersOnline() {
  const rows = await authedSupabaseFetch('/rest/v1/rpc/get_my_designers_v16', {
    method: 'POST', body: JSON.stringify({}),
  });
  return Array.isArray(rows) ? rows[0] || null : rows || null;
}

export async function setDesignLoadoutOnline({kind, designId=null, droneId=null}={}) {
  const rows = await authedSupabaseFetch('/rest/v1/rpc/set_design_loadout_v16', {
    method: 'POST',
    body: JSON.stringify({
      p_kind: String(kind || ''),
      p_design_id: designId ? String(designId) : null,
      p_drone_id: droneId ? String(droneId) : null,
    }),
  });
  return Array.isArray(rows) ? rows[0] || null : rows || null;
}

export async function claimGateDroneDesignOnline({gate, completion}={}) {
  const rows = await authedSupabaseFetch('/rest/v1/rpc/claim_gate_drone_design_v163', {
    method: 'POST',
    body: JSON.stringify({
      p_gate: String(gate || ''),
      p_completion: Math.max(1, Math.round(Number(completion)||0)),
    }),
  });
  return Array.isArray(rows) ? rows[0] || null : rows || null;
}


export async function claimEventDesignerOnline({eventId, eventKey}={}) {
  const rows = await authedSupabaseFetch('/rest/v1/rpc/claim_event_designer_v165', {
    method: 'POST',
    body: JSON.stringify({
      p_event_id: String(eventId || '').slice(0,160),
      p_event_key: String(eventKey || '').slice(0,64),
    }),
  });
  return Array.isArray(rows) ? rows[0] || null : rows || null;
}


// ===================== ADMIN CONTROL PANEL =====================
export async function getAdminStatus(){
  return authedServerFetch('/api/admin/status');
}
export async function adminSearchAccounts(query=''){
  return authedServerFetch(`/api/admin/users?q=${encodeURIComponent(String(query||''))}`);
}
export async function adminRecentActions(){
  return authedServerFetch('/api/admin/actions');
}
export async function adminBanAccount(userId,{minutes=0,reason=''}={}){
  return authedServerFetch(`/api/admin/users/${encodeURIComponent(userId)}/ban`,{method:'POST',body:JSON.stringify({minutes,reason})});
}
export async function adminUnbanAccount(userId){
  return authedServerFetch(`/api/admin/users/${encodeURIComponent(userId)}/unban`,{method:'POST',body:'{}'});
}
export async function adminResetAccount(userId){
  return authedServerFetch(`/api/admin/users/${encodeURIComponent(userId)}/reset`,{method:'POST',body:'{}'});
}
export async function adminDeleteAccount(userId){
  return authedServerFetch(`/api/admin/users/${encodeURIComponent(userId)}`,{method:'DELETE'});
}


// ===================== V17.7.1 TELEMETRY =====================
export async function pushTelemetryBatch(batch={}){
  return authedServerFetch('/api/telemetry',{method:'POST',body:JSON.stringify(batch||{})});
}
export async function adminTelemetryOverview(){
  return authedServerFetch('/api/admin/telemetry');
}
export async function adminPlayerTelemetry(userId){
  return authedServerFetch(`/api/admin/telemetry/${encodeURIComponent(String(userId||''))}`);
}


// ===================== V17.9.0 BATTLE GROUPS =====================
export async function getBattleGroupOnline(){
  const rows=await authedSupabaseFetch('/rest/v1/rpc/get_my_battle_group_v179',{method:'POST',body:'{}'});
  return Array.isArray(rows)?rows[0]||null:rows||null;
}
export async function createBattleGroupOnline(){
  const rows=await authedSupabaseFetch('/rest/v1/rpc/create_battle_group_v179',{method:'POST',body:'{}'});
  return Array.isArray(rows)?rows[0]||null:rows||null;
}
export async function inviteBattleGroupOnline(callsign){
  const rows=await authedSupabaseFetch('/rest/v1/rpc/invite_battle_group_v179',{method:'POST',body:JSON.stringify({p_callsign:String(callsign||'').trim().slice(0,24)})});
  return Array.isArray(rows)?rows[0]||null:rows||null;
}
export async function searchBattleGroupPlayersOnline(query){
  const rows=await authedSupabaseFetch('/rest/v1/rpc/search_battle_group_players_v1793',{method:'POST',body:JSON.stringify({p_query:String(query||'').trim().slice(0,24)})});
  return Array.isArray(rows)?rows[0]||null:rows||null;
}
export async function inviteBattleGroupUserOnline(userId){
  const rows=await authedSupabaseFetch('/rest/v1/rpc/invite_battle_group_user_v1793',{method:'POST',body:JSON.stringify({p_target_user_id:String(userId||'')})});
  return Array.isArray(rows)?rows[0]||null:rows||null;
}
export async function respondBattleGroupInviteOnline(inviteId,accept){
  const rows=await authedSupabaseFetch('/rest/v1/rpc/respond_battle_group_invite_v179',{method:'POST',body:JSON.stringify({p_invite_id:String(inviteId||''),p_accept:!!accept})});
  return Array.isArray(rows)?rows[0]||null:rows||null;
}
export async function leaveBattleGroupOnline(){
  const rows=await authedSupabaseFetch('/rest/v1/rpc/leave_battle_group_v179',{method:'POST',body:'{}'});
  return Array.isArray(rows)?rows[0]||null:rows||null;
}
export async function kickBattleGroupMemberOnline(userId){
  const rows=await authedSupabaseFetch('/rest/v1/rpc/kick_battle_group_member_v179',{method:'POST',body:JSON.stringify({p_target_user_id:String(userId||'')})});
  return Array.isArray(rows)?rows[0]||null:rows||null;
}
export async function setBattleGroupRallyOnline({mapId,territoryFaction,x,y}={}){
  const rows=await authedSupabaseFetch('/rest/v1/rpc/set_battle_group_rally_v179',{method:'POST',body:JSON.stringify({p_map_id:String(mapId||''),p_territory_faction:territoryFaction?String(territoryFaction):null,p_x:Number(x)||0,p_y:Number(y)||0})});
  return Array.isArray(rows)?rows[0]||null:rows||null;
}


// ===================== V18.1.0 DATA DRIVEN CORE =====================
export async function loadRuntimeConfigOnline(refresh=false){
  // V18.1.3+: o navegador lê somente o snapshot validado pelo Render.
  return serverFetch(`/api/runtime/topbar${refresh?'?refresh=1':''}`,{},true);
}

// ===================== V18.1.6B ADMIN INTERFACE EDITOR =====================
export async function adminUpdateRuntimeModuleOnline(moduleKey,payload={}){
  return serverFetch(`/api/admin/runtime/interface/${encodeURIComponent(String(moduleKey||''))}`,{method:'POST',body:JSON.stringify(payload||{})},true);
}


// ===================== V18.1.1 NPC RUNTIME CONFIG =====================
export async function loadNpcRuntimeConfigOnline(refresh=false){
  return serverFetch(`/api/runtime/npcs${refresh?'?refresh=1':''}`,{},true);
}

// ===================== V18.1.6C ADMIN NPC EDITOR =====================
export async function adminUpdateNpcRuntimeOnline(npcKey,payload={}){
  return serverFetch(`/api/admin/runtime/npcs/${encodeURIComponent(String(npcKey||''))}`,{method:'POST',body:JSON.stringify(payload||{})},true);
}
export async function adminUpdateNpcSpawnRuntimeOnline(npcKey,mapId,payload={}){
  return serverFetch(`/api/admin/runtime/npcs/${encodeURIComponent(String(npcKey||''))}/spawns/${encodeURIComponent(String(mapId||''))}`,{method:'POST',body:JSON.stringify(payload||{})},true);
}

// ===================== V18.1.6A ADMIN RUNTIME MONITOR =====================
export async function loadAdminRuntimeMonitorOnline(refresh=false){
  return serverFetch(`/api/admin/runtime-monitor${refresh?'?refresh=1':''}`,{},true);
}


// ===================== V18.1.4 WORLD RUNTIME CONFIG =====================
export async function loadWorldRuntimeConfigOnline(refresh=false){
  return serverFetch(`/api/runtime/world${refresh?'?refresh=1':''}`,{},true);
}

// ===================== V18.1.6D ADMIN WORLD EDITOR =====================
export async function adminUpdateWorldMapOnline(mapId,payload={}){
  return serverFetch(`/api/admin/runtime/world/maps/${encodeURIComponent(String(mapId||''))}`,{method:'POST',body:JSON.stringify(payload||{})},true);
}
export async function adminUpdateWorldResourceOnline(resourceKey,payload={}){
  return serverFetch(`/api/admin/runtime/world/resources/${encodeURIComponent(String(resourceKey||''))}`,{method:'POST',body:JSON.stringify(payload||{})},true);
}
export async function adminUpdateWorldSectorOnline(sectorLabel,payload={}){
  return serverFetch(`/api/admin/runtime/world/sectors/${encodeURIComponent(String(sectorLabel||''))}`,{method:'POST',body:JSON.stringify(payload||{})},true);
}
export async function adminUpdateWorldPortalOnline(portalKey,payload={}){
  return serverFetch(`/api/admin/runtime/world/portals/${encodeURIComponent(String(portalKey||''))}`,{method:'POST',body:JSON.stringify(payload||{})},true);
}
export async function adminUpdateWorldResourcePoolOnline(mapId,resourceKey,payload={}){
  return serverFetch(`/api/admin/runtime/world/maps/${encodeURIComponent(String(mapId||''))}/resources/${encodeURIComponent(String(resourceKey||''))}`,{method:'POST',body:JSON.stringify(payload||{})},true);
}


// ===================== V18.1.5 SYSTEMS RUNTIME CONFIG =====================
export async function loadSystemsRuntimeConfigOnline(){
  return serverFetch('/api/runtime/systems',{},true);
}
