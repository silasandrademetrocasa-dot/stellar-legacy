import test from 'node:test';
import assert from 'node:assert/strict';

const pending = new Map();
const session = new Map();
const local = new Map();
const settings = { google: true };
let redirects = [];
let exchangedTokens = [];
let now = 1700000000000;
const pagePath = '/';
const location = {
  origin: 'https://darkorbit-legacy.onrender.com', pathname: pagePath,
  hash: '', search: '', assign: (url) => redirects.push(url),
};
globalThis.window = { location };
globalThis.sessionStorage = { setItem:(k,v)=>session.set(k,v),getItem:k=>session.get(k)??null,removeItem:k=>session.delete(k) };
globalThis.localStorage = {removeItem:k=>local.delete(k)};
globalThis.history = { replaceState:(_obj,_title,url)=>{location.hash='';location.search='';location.pathname=url;} };
globalThis.document={title:'Stellar Legacy'};
globalThis.fetch = async (url, options={}) => {
  if (url === '/api/config') return new Response(JSON.stringify({supabaseUrl:'https://rxcekofbxzivuavtqjwp.supabase.co',supabasePublishableKey:'TEST_ANON'}),{status:200});
  if (String(url).endsWith('/auth/v1/settings')) return new Response(JSON.stringify({external:{google:settings.google}}),{status:200});
  if (url === '/api/auth/google/session') {
    exchangedTokens.push(options?.headers?.Authorization);
    return new Response(JSON.stringify({user:{id:'KEEP_ID',email:'existing@gmail.com',callsign:'AcePilot'},game_session_id:'session_123'}),{status:200});
  }
  throw Error(`Unexpected request: ${url}`);
};
const auth = await import('../public/api.js');

test('provider unavailable blocks redirect safely',async()=>{
  settings.google=false;
  await assert.rejects(auth.beginGoogleSignIn(), /Google ainda não está habilitado/);
  assert.equal(redirects.length,0);
  settings.google=true;
});

test('Google button redirects to correct Supabase auth callback',async()=>{
  await auth.beginGoogleSignIn();
  assert.equal(redirects.length,1);
  const url = new URL(redirects[0]);
  assert.equal(url.origin,'https://rxcekofbxzivuavtqjwp.supabase.co');
  assert.equal(url.pathname,'/auth/v1/authorize');
  assert.equal(url.searchParams.get('provider'),'google');
  assert.equal(url.searchParams.get('redirect_to'),'https://darkorbit-legacy.onrender.com/');
  assert.match(session.get('stellarLegacyGoogleOAuthPendingV18216'),/redirectTo/);
});

test('OAuth callback exchanges verified token and stores game session in tab only',async()=>{
  location.hash='#access_token=AUTH_TOKEN&refresh_token=REFRESH&token_type=bearer&expires_in=3600';
  const result = await auth.restoreGoogleSignInFromUrl();
  assert.equal(result.user.id,'KEEP_ID');
  assert.equal(auth.getUser().callsign,'AcePilot');
  assert.equal(auth.getSession().game_session_id,'session_123');
  assert.equal(exchangedTokens[0],'Bearer AUTH_TOKEN');
  assert.equal(location.hash,'');
  assert.equal(local.size,0);
  assert.ok(session.has('stellarLegacyV4Session'));
});

test('Never auto-login after page reload',async()=>{
  auth.signOutLocal();
  assert.equal(await auth.restoreGoogleSignInFromUrl(),null);
  assert.equal(auth.getUser(),null);
});

test('Cancelled Google OAuth returns error and removes sensitive URL',async()=>{
  await auth.beginGoogleSignIn();
  location.hash='#error=access_denied&error_description=Access+denied';
  await assert.rejects(auth.restoreGoogleSignInFromUrl(),/cancelada ou não autorizada/);
  assert.equal(location.hash,'');
  assert.equal(session.has('stellarLegacyGoogleOAuthPendingV18216'),false);
});

test('Unsolicited fragment does not create game session',async()=>{
  location.hash='#access_token=SPOOF&refresh_token=SPOOF&token_type=bearer';
  assert.equal(await auth.restoreGoogleSignInFromUrl(),null);
  assert.equal(exchangedTokens.length,1);
  location.hash='';
});
