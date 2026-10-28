// V101: Somente o APK possui cofre de sessão persistente (Android Keystore).
// No navegador, memorizar e-mail é opcional; senha e refresh_token NUNCA vão para localStorage.
export const REMEMBER_EMAIL_KEY_V101 = 'stellarLoginEmailV101';
export const REMEMBER_EMAIL_CHOICE_V101 = 'stellarLoginRememberEmailV101';
export const REMEMBER_APK_CHOICE_V101 = 'stellarLoginRememberApkV101';

const storage = () => { try { return window.localStorage; } catch { return null; } };
function androidVault(){
  try {
    const bridge=window.StellarSessionVault;
    return bridge && typeof bridge.loadSession==='function' &&
      typeof bridge.storeSession==='function' && typeof bridge.clearSession==='function' ? bridge : null;
  } catch { return null; }
}
export function canRememberSessionV101(){ return !!androidVault(); }
export function rememberSessionEnabledV101(){
  return canRememberSessionV101() && storage()?.getItem(REMEMBER_APK_CHOICE_V101)!=='off';
}
export function setRememberSessionV101(enabled){
  try { storage()?.setItem(REMEMBER_APK_CHOICE_V101,enabled?'on':'off'); } catch {}
  if(!enabled) clearPersistedSessionV101();
}
export function rememberEmailEnabledV101(){ return storage()?.getItem(REMEMBER_EMAIL_CHOICE_V101)!=='off'; }
export function getRememberedEmailV101(){
  if(!rememberEmailEnabledV101())return '';
  try { return String(storage()?.getItem(REMEMBER_EMAIL_KEY_V101)||'').slice(0,254); } catch { return ''; }
}
export function setRememberEmailV101(enabled,email=''){
  try {
    storage()?.setItem(REMEMBER_EMAIL_CHOICE_V101,enabled?'on':'off');
    if(enabled){
      const clean=String(email||'').trim().toLowerCase();
      if(clean&&clean.includes('@'))storage()?.setItem(REMEMBER_EMAIL_KEY_V101,clean.slice(0,254));
    } else storage()?.removeItem(REMEMBER_EMAIL_KEY_V101);
  }catch{}
}
export function persistSessionV101(session,user){
  const vault=androidVault();
  if(!vault || !rememberSessionEnabledV101())return false;
  if(!session?.refresh_token || !session?.game_session_id || !user?.id)return false;
  // Nunca guardar senha, access token de curta duração ou estado de jogo no cofre.
  const payload={session:{refresh_token:String(session.refresh_token),game_session_id:String(session.game_session_id)},
    user:{id:String(user.id),email:String(user.email||''),callsign:String(user.callsign||'')}};
  try { vault.storeSession(JSON.stringify(payload));return true; }catch{return false;}
}
export function loadPersistedSessionV101(){
  const vault=androidVault();
  if(!vault || !rememberSessionEnabledV101())return null;
  try {
    const raw=vault.loadSession();
    if(!raw)return null;
    const data=JSON.parse(raw);
    if(typeof data?.session?.refresh_token!=='string' ||
      typeof data?.session?.game_session_id!=='string' ||
      typeof data?.user?.id!=='string' ||
      !data.session.refresh_token || !data.session.game_session_id || !data.user.id)return null;
    return {session:{refresh_token:data.session.refresh_token,game_session_id:data.session.game_session_id},
      user:{id:data.user.id,email:String(data.user.email||''),callsign:String(data.user.callsign||'')}};
  }catch{return null;}
}
export function clearPersistedSessionV101(){
  try { androidVault()?.clearSession(); }catch{}
}
