// Android uses the installed APK as its only static resource version.
// Retire older PWA caches before starting gameplay; never clear sessions or player saves.
if (globalThis.StellarAndroid && 'serviceWorker' in navigator) {
  globalThis.__stellarNativeReady = (async () => {
    const controlled = !!navigator.serviceWorker.controller;
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map(registration => registration.unregister()));
    if ('caches' in globalThis) {
      const keys = await caches.keys();
      await Promise.all(keys.filter(key => key.startsWith('stellar-shell-')).map(key => caches.delete(key)));
    }
    if (controlled && registrations.length) {
      location.reload(); // the next document is no longer controlled by the retired worker
      await new Promise(() => {}); // no game actions before the clean document loads
    }
  })();
}
