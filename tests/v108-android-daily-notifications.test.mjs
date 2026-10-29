import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read = (p)=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const manifest=read('android/app/src/main/AndroidManifest.xml');
const activity=read('android/app/src/main/java/com/stellarlegacy/mobile/MainActivity.java');
const alarm=read('android/app/src/main/java/com/stellarlegacy/mobile/DailyResetNotifier.java');
const receiver=read('android/app/src/main/java/com/stellarlegacy/mobile/DailyResetReceiver.java');
const html=read('public/index.html');
const ui=read('public/modules/android-daily-alerts-v108.js');

test('V108 lembrete nativo desabilitado por padrão e depende do consentimento',()=>{
  assert.match(alarm,/getBoolean\(ENABLED, false\)/);
  assert.match(alarm,/!enabled\(ctx\) \|\| !notificationsAllowed\(ctx\)/);
  assert.match(activity,/@JavascriptInterface public void enable\(\)/);
  assert.match(activity,/@JavascriptInterface public void disable\(\)/);
  assert.match(ui,/bridge\.enable\(\)/);
  assert.match(ui,/bridge\.disable\(\)/);
});
test('V108 Android 13 pede permissao em tempo de execucao e nunca pede alarme exato',()=>{
  assert.match(manifest,/android\.permission\.POST_NOTIFICATIONS/);
  assert.match(activity,/requestPermissions\(new String\[\]\{ Manifest\.permission\.POST_NOTIFICATIONS \}/);
  assert.match(activity,/onRequestPermissionsResult/);
  assert.doesNotMatch(manifest,/SCHEDULE_EXACT_ALARM|USE_EXACT_ALARM/);
  assert.match(alarm,/setAndAllowWhileIdle\(AlarmManager\.RTC_WAKEUP/);
  assert.doesNotMatch(alarm,/setExactAndAllowWhileIdle/);
});
test('V108 agendado por Sao Paulo, mantido apos boot/reinstalacao e notifica no maximo uma vez ao dia',()=>{
  assert.match(alarm,/TimeZone\.getTimeZone\("America\/Sao_Paulo"\)/);
  assert.match(alarm,/time\.set\(Calendar\.HOUR_OF_DAY, 0\)/);
  assert.match(alarm,/time\.add\(Calendar\.DAY_OF_MONTH, 1\)/);
  assert.match(alarm,/day\.equals\(prefs\(ctx\)\.getString\(LAST_DAY/);
  assert.match(alarm,/putString\(LAST_DAY, day\)\.commit\(\)/);
  assert.match(receiver,/ACTION_BOOT_COMPLETED/);
  assert.match(receiver,/ACTION_MY_PACKAGE_REPLACED/);
  assert.match(receiver,/ACTION_TIMEZONE_CHANGED/);
  assert.match(receiver,/DailyResetNotifier\.scheduleNext\(context\)/);
  assert.match(manifest,/android\.permission\.RECEIVE_BOOT_COMPLETED/);
});
test('V108 aviso nao altera reset, salvamento ou economia',()=>{
  assert.doesNotMatch(alarm + receiver + ui,/fetch\(|\.rpc\(|saveCloudSave|flushCloudSave|game_saves|credits\s*[+\-=]|uridium\s*[+\-=]/);
  assert.match(alarm,/Notification\.Builder\(ctx, CHANNEL\)/);
  assert.match(alarm,/"As missoes diarias e 10 batalhas da Arena renovam a cada dia/);
  assert.match(activity,/addJavascriptInterface\(new DailyAlertsBridge\(\), "StellarDailyAlerts"\)/);
});
test('V108 configuracoes mostram aviso apenas no APK e incluem teste imediato',()=>{
  assert.match(html,/class="settings-section hidden" id="androidDailyAlertsSectionV108" hidden/);
  assert.match(ui,/if \(section && bridge && typeof bridge\.status === 'function'\)/);
  assert.match(ui,/section\.classList\.remove\('hidden'\)/);
  assert.match(ui,/bridge\.test\(\)/);
  assert.match(html,/android-daily-alerts-v108\.js\?v=108\.0\.0/);
});
