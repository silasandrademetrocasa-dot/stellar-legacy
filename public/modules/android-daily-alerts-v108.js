/* V108: preferencias do aviso local Android. Nenhuma API HTTP ou manipulacao de progresso. */
const bridge = globalThis.StellarDailyAlerts;
const section = document.getElementById('androidDailyAlertsSectionV108');
if (section && bridge && typeof bridge.status === 'function') {
  section.hidden = false;
  section.classList.remove('hidden');
  const byId = id => document.getElementById(id);
  const enable = byId('androidDailyAlertsEnableV108');
  const disable = byId('androidDailyAlertsDisableV108');
  const test = byId('androidDailyAlertsTestV108');
  const label = byId('androidDailyAlertsStatusV108');
  function status() {
    let state = 'disabled';
    try { state = String(bridge.status()); } catch { state = 'unavailable'; }
    label.textContent = ({
      enabled: 'ATIVO • Proximo aviso: perto de 00h, horario de Brasilia. Funciona mesmo com o APK fechado.',
      disabled: 'DESATIVADO • Toque em ATIVAR para receber o lembrete diario.',
      permission_denied: 'SEM PERMISSAO • Ative as notificacoes nas configuracoes do Android e tente novamente.',
      unavailable: 'Avisos indisponiveis neste dispositivo.'
    })[state] || 'Avisos indisponiveis.';
    if (enable) enable.disabled = state === 'enabled';
    if (disable) disable.disabled = state === 'disabled';
    if (test) test.disabled = state !== 'enabled';
  }
  enable?.addEventListener('click', () => {
    try { bridge.enable(); label.textContent = 'Aguardando permissao do Android...'; }
    catch { label.textContent = 'Nao foi possivel ativar os avisos.'; }
  });
  disable?.addEventListener('click', () => { try { bridge.disable(); } catch {} status(); });
  test?.addEventListener('click', () => { try { bridge.test(); } catch {} });
  globalThis.addEventListener('stellar-daily-alerts-status', status);
  document.getElementById('configBtn')?.addEventListener('click', status);
  status();
}
