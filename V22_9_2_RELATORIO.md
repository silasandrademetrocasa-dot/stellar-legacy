# Relatório V22.9.2 — Mineração e eventos

**Incidente confirmado:** o Render registrava `[ore-grant] Concessão de minério indisponível.`. A função `grantOreReward` era passada por `server/index.js` à `attachSharedUniverse`, mas não era desestruturada e não entrava no objeto `world`. A sala WebSocket sempre caía no erro antes de chamar a RPC. Corrigidos assinatura e mapeamento de callback em `server/world.js`.

**Evento ausente no 1-4:** o banco programa cinco eventos com regras diferentes, incluindo `battle` com `battle_only: true`. No horário do screenshot (17/10 23:52 São Paulo), a janela de `battle` estava ativa, compatível com 4-X, não com 1-4. A V22.9.1 transmitia apenas o evento jogável na sala, logo o 1-4 recebia `null`. Agora snapshot, notificações de troca de evento e sincronização após entrada carregam `globalEvent` separado do `event` local; o cliente exibe o evento global **somente como aviso** nos setores não elegíveis. O progresso e os prêmios continuam vinculados ao evento jogável confirmado pela sala.

**Verificações:** `npm run check`, `npm run check:v21`, 309/309 testes com Node test runner, incluindo cinco novos testes de regressão. 216 assets resolvidos e 101 arquivos JavaScript verificados.

**Supabase** (leitura não destrutiva): 6 saves, 9 relés (9 dominados), 0 recibos de minério antes da publicação; a RPC de minério permanece disponível ao `service_role` e negada ao `authenticated`. Nenhuma migração SQL nesta versão.

**Limite:** sem teste de coleta autenticada em ambiente publicado nesta execução. Confirmar após subir o ZIP. Ainda não é autorização para cobrar dinheiro real.
