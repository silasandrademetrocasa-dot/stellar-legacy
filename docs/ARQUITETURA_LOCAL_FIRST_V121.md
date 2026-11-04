# Arquitetura local-first V121.0 — contrato de migração

**Situação:** `V121-LAB` entregue como laboratório com modo espelho opt-in; **não** virou o mecanismo definitivo de economia do servidor.

## Estruturas locais reais

- `saves` (IndexedDB): uma linha por `owner`, com `state`, `revision`, `hash SHA-256`, `resetEpoch` e horário de gravação.
- `checkpoints`: `A`, `B`, `C` por `owner`. `A` é o último checkpoint no marco de rotação; `B` e `C` são históricos. Checkpoints não competem com o save.
- `outbox`: operações com UUID e status `pending`/`acked`. Confirmar no cliente **não significa** concessão de crédito/STL: isso só existe quando o servidor confirmar.
- `bridge`: em `/?localfirst=1`, espelha o estado atual em IndexedDB, usa fallback quando não há cache legado e preserva a rotina atual de `localStorage`, Render e Supabase.
- `lab-v121.html`: simula compras com Créditos **fictícios**, CONF1/2, checkpoint e reabertura usando itens reais de `data.js`.
- `createLocalSyncLoopV121`: coleta pendências a cada 5s em primeiro plano, mas **exige** adaptador `sendBatch` que confirme recibos de servidor, ainda não implementado no endpoint Render.

## Ciclo futuro de um comando econômico

1. A UI cria um `operation_id` UUID e mostra estado visual **provisório**.
2. IndexedDB grava estado local e intenção no mesmo commit.
3. Render recebe lote, autentica o usuário, verifica idempotência e o estado econômico atual no Supabase.
4. Supabase valida gasto/recebimento, estoque, regras e concessão na mesma transação (não aceita `state`/preços do cliente como prova).
5. Render responde com recibo e saldos definitivos; IndexedDB marca apenas os IDs confirmados; o cliente aplica a reconciliação.
6. Em offline/timeout, a operação permanece pendente e jamais concede itens protegidos definitivamente sem ACK.

**Importante:** reenvio em lote de 5s não significa POST de save completo ou atualização de `game_saves` a cada 5s. É uma meta de latência durante sessão ativa, sujeita à suspensão no Android.

## Preservação / segurança

- A chave de serviço do Supabase fica somente no Render.
- `localStorage` permanece como fallback na fase piloto, porque inúmeras rotas legadas ainda assumem leitura síncrona.
- O cliente não controla moedas compartilhadas nem resultados PvP.
- `savePromotionReadinessV1195` continua bloqueando `enforce` até que todas as rotas sejam migradas.
- O SQL de catálogo V121 é não destrutivo e mantém alias legado `legacy_id`.
- Para regressão: `node --test tests/v121-local-first.test.mjs`, `npm run check`, `npm test`.

## Próximas tarefas obrigatórias antes do cutover

- Mover aquisição/venda de itens e missão para os comandos de outbox com ACK transacional real.
- Substituir fallback de save síncrono no boot por leitura IndexedDB segura e resolução de conflitos por revisão.
- Acrescentar testagem real em Android/WebView de requisições concorrentes, relogin, limpeza de cache, modo privado e falta de espaço.
- Validar IndexedDB, PWA, WebView e 2 contas em produção de testes; não usar a base atual como área de ensaios destrutivos.
- Após rodar inventário relacional completo e validar papel ADM, executar um reset **somente do progresso de testes**, sem apagar `auth.users` e sem apagar catálogos ou normas do jogo.
