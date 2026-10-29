# Stellar Legacy — V105.1B: lembrete nativo de novo dia (Android)

Base: **V105.1 rede segura** (inclui HOTFIX3 para missões na cópia de desenvolvimento). Pacote incremental — substituir caminhos idênticos no repositório; **não** sobrescrever o jogo completo. Nenhum SQL, regra de Arena, regra de missões, save, recompensa, API de economia ou serviço Render foi modificado.

## Comportamento

- Na tela **Configurações → JOGO**, aparece somente no APK Android a seção **AVISOS DIÁRIOS DO APK**.
- **ATIVAR LEMBRETES:** consentimento explícito do jogador. Android 13+ pede `POST_NOTIFICATIONS` quando necessário.
- À **00:00 de America/Sao_Paulo**, o Android agenda um aviso local: **“Novo dia no Stellar Legacy! As missões diárias e 10 batalhas da Arena renovam a cada dia. Confira suas recompensas!”**.
- Lembrete funciona com o app fechado ou sem internet, desde que o dispositivo permita notificações/alarme. **Não exige Render ligado à meia-noite** nem cron ou polling adicional.
- Como usa `AlarmManager.setAndAllowWhileIdle` (sem solicitar privilégios de alarme exato), **o sistema operacional pode atrasar o aviso** em Doze/economia de bateria. Não é garantia de entrega às 00:00:00.
- Tocar na notificação abre o APK, sem acionar chamadas automáticas de compra, recompensa ou alteração de progresso.
- `TESTAR AVISO` dispara uma notificação local de teste, sem mexer no reset nem na contagem diária.
- `DESATIVAR` cancela o alarme e grava a preferência local. Preferência é mantida ao atualizar o APK; em desinstalação/limpeza de dados desaparece.
- No reboot/atualização do APK ou mudança de relógio/fuso, o Android rearma o próximo alerta somente se opt-in continuar ativo.
- Duplicações são bloqueadas por dia em fuso de São Paulo; alarmes atrasados após as 06h não notificam.
- O aviso é **informativo**, não faz reset de progresso. Banco de dados segue autoridade. O `get_arena_state` e `arena_attack` já usam `(now() at time zone 'America/Sao_Paulo')::date`.
- Missão diária é gerenciada pelo jogo no dia local; usuários que mudarem de fuso podem perceber diferença; esta atualização não muda essa regra.

## Instalação

1. Aplicar o ZIP na **raiz** do GitHub que já contém a V105.1. Preservar pastas `android/`, `public/`, `tests/` e `docs/`.
2. Fazer commit e deploy do Render para a página HTML refletir a atualização. **Recompilar um NOVO APK** no workflow **Stellar Legacy — APK LOCAL**; apenas deploy do Render não atualiza Java empacotado em APK antigo.
3. Instalar o APK resultante, ir em **CONF → JOGO → AVISOS DIÁRIOS DO APK**, ativar e aceitar a permissão se necessário.
4. Tocar **TESTAR AVISO**. Conferir ícone, texto, abertura do app ao tocar.
5. Fechar o app, testar notificação na virada de **00:00 Brasília** (pode atrasar), e conferir Arena 10/10 + missões após autenticação. Testar com Wi-Fi desligado para confirmar que o lembrete em si é local.
6. Conferir **DESATIVAR**, reiniciar o celular e atualizar APK; notificação não deve reaparecer quando desativada. Se o Android tiver restrições de bateria/notificações, configurar permissões no sistema.

## Auditoria

- `npm run verify` — **207/207 testes**.
- `node scripts/prepare-apk-assets.js` e `node scripts/verify-apk.js` — assets locais validados.
- Build Android **ainda precisa ser executada pelo GitHub Actions**, pois não há Android SDK/Gradle neste ambiente de validação.
- Lançamento não altera `public/game.js`, `server/`, `sql/`, `.github/` nem as chamadas de save e economia.
