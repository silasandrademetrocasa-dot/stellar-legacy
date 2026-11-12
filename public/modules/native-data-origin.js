// Only public URL metadata crosses the Android bridge; API keys/tokens stay in the HTTP layer.
export function configureNativeDataOrigin(url, native = globalThis.StellarAndroid) {
  if (!native) return; // Web already permits the configured Supabase API origin.
  if (typeof native.allowDataOrigin !== 'function') {
    throw Object.assign(new Error('Atualize o APK para reconectar ranking, chat, Arena e resgates.'), {code:'APK_UPDATE_REQUIRED'});
  }
  if (native.allowDataOrigin(String(url)) !== true) {
    throw Object.assign(new Error('A conexão de dados do aplicativo não foi autorizada. Reabra o APK.'), {code:'APK_DATA_ORIGIN_REJECTED'});
  }
}
