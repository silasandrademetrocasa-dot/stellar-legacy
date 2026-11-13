# Stellar Legacy V145.1 — correção da demora nas compras

Versão de aplicação: **47.7.82**. Cumulativa sobre V144.1 (47.7.80) ou V145.0 (47.7.81). As artes e o balanceamento foram preservados. Não houve deploy nem SQL em produção nesta entrega.

## Motivo da demora

A V145.0 otimizou o transporte de save, mas não encurtou o caminho das compras. A compra em lote ainda aguardava um `flushCloudSave(true)` completo antes de enviar a compra. A compra de catálogo fazia duas leituras do mesmo recibo, recarregava todo o Live Ops e consultava a loja Premium completa em etapas separadas. Missões, seleção de munição e alterações de porão podiam fazer a compra aguardar uma sincronização alheia à operação.

## Correções aplicadas

- Compra em lote de munição/míssil não exige mais um save completo prévio.
- Compra de item/formação não espera o save de missões, escolha de munição ou porão. Se existe uma montagem pendente e a compra mudará a posse de nave, drone ou AUX, a confirmação de montagem continua necessária para preservar os equipamentos.
- A resposta de compra usa o instalador econômico existente, que preserva missões/montagens pendentes e reaplica o consumo de munições pelo journal. Não foi feito um overwrite bruto de progresso local.
- AUTO BUY passa a consultar o estoque canônico sem aguardar o save de porão/seleção. Posse da CPU, base e saldo continuam validados no servidor. A restrição de montagem pendente do AUTO BUY existente continua.
- Cliques repetidos do mesmo jogador no mesmo produto durante uma compra compartilham uma única requisição. A próxima compra intencional, depois da conclusão, recebe outro ID. IDs persistentes continuam protegendo reenvio após perda de resposta.
- Há indicação imediata “confirmando compra”. O estoque definitivo continua sendo entregue após confirmação real; não é uma mensagem falsa de item adquirido.
- Respostas de outra conta ou sessão não são instaladas pelos novos callbacks. Recibos válidos atrasados não substituem um estado mais recente.

## Caminho curto Render/Supabase

Uma nova função **de leitura**, `stellar_shop_context_v1451`, devolve em uma chamada o estado, recibo existente, somente o produto solicitado e a situação Premium necessária. Ela não compra, debita, concede itens nem muda preços. O commit continua passando por `stellar_player_commit`, com seus locks, recibos, validação de reservas de leilão e save único/ABC.

| Caminho normal, sem conflito | V145.0 | V145.1 com SQL novo |
|---|---|---|
| Item de catálogo | 6 chamadas de dados Render/Supabase, incluindo recibo duplicado | 1 contexto + 1 commit |
| Compra em lote | Save prévio no cliente + 4 chamadas de dados na rota de compra | Sem save prévio; 1 contexto + 1 commit |
| AUTO BUY | Preflight local podia aguardar save; leituras de catálogo/save/Premium/recibo e commit | Sem preflight alheio; 1 contexto + 1 commit |
| Repetir compra de catálogo/lote já confirmada | Recuperação por recibo | 1 contexto; sem novo débito |

Essas contagens são de chamadas de dados do trecho de compra, **não de todas as queries SQL internas**. Não incluem autenticação, sessão, guarda de farm, conflitos/retries ou outras funcionalidades concorrentes. A consulta de saldo/recibo nunca é cacheada.

Sem o SQL novo, existe fallback compatível: as leituras legadas começam em paralelo e o recibo não é consultado duas vezes. A ausência da função é memorizada por 60s para não repetir uma chamada de descoberta a cada compra. Falhas de permissão ou outro erro da função nova não disparam fallback silencioso.

## Como aplicar

1. Use `Stellar_Legacy_V145_1_COMPRAS_CUMULATIVA.zip` no instalador universal, sobre a base V144.1 ou V145.0. O patch já contém as melhorias V145.0; não precisa reenviar as artes ou as seis partes do projeto.
2. O pacote inclui `sql/STELLAR_V145_1_COMPRA_CONTEXTO.sql`. Aplique esse SQL no Supabase do ambiente escolhido para habilitar o contexto consolidado. Ele adiciona somente a função de leitura e as permissões de configuração estritamente para `service_role`; não altera saldos, inventários, preços ou funções existentes de commit. Não foi executado em produção aqui.
3. Publique o código no Render quando decidir autorizar o deploy. Se a função SQL for aplicada com o processo já aberto após um fallback, espere 60s ou reinicie o serviço para retentar a descoberta.
4. **Gere e instale um novo APK pelo workflow existente**: os scripts do jogo são incorporados ao APK. Alterar apenas o Render não remove o `await` do APK antigo.
5. Faça uma compra comum e uma de munição. Em depuração, `window.stellarPurchaseMetricsV1451.snapshot()` informa tempo do cliente, tempo da rota e se o contexto foi `consolidated` ou `legacy`, sem registrar saldos ou identificadores de conta.

Opcionalmente: `DATABASE_URL` configurada e `bash scripts/migrate-v1451.sh apply` aplica o preflight existente e o SQL novo. A variável deve ser definida no ambiente, sem colocar a senha em mensagens.

## Testes

Suíte final: **266 testes contabilizados, 265 passaram, zero falhas e um ignorado por falta de JDK**. `npm run check` e `npm run apk:check` passaram. Não foi gerado nem executado um APK físico nesta entrega.

Os nove testes novos cobrem as rotas reais de catálogo/lote/AUTO BUY com PostgreSQL/PGlite, usando o corpo real das rotas, o adaptador RPC e as funções SQL do fixture. Foram executadas 100 compras de catálogo e 100 compras em lote, reenvio sem cobrança dupla, leitura de produto desativado após confirmação, Premium e mudança de preço, isolamento de permissões, rollback sem perda de save, fallback, falhas fechadas, cliques repetidos e preservação de hangar/munição. O teste da callback real verifica que uma compra comum não chama o save de missões/munições/porão.

Os testes contam exatamente duas RPCs no caminho novo normal (contexto e commit). Isso **não demonstra uma latência específica em segundos no seu Render ou Android**. Não foi feita uma medição remota antes/depois. Rede lenta, serviço Render iniciando e consultas de autenticação ainda podem afetar a espera.

## Rollback e limites

Para reverter o código, restaure a versão anterior da aplicação e gere o APK correspondente. O arquivo `sql/STELLAR_V145_1_COMPRA_ROLLBACK.sql` remove somente a nova função de contexto; não remove progresso ou recibos. O código suporta sua ausência. As permissões de leitura de configuração de `service_role` são mantidas, pois podem já existir para outros consumidores.

Esta correção é focada na espera de compra comum/suprimentos e AUTO BUY. Protocolos, craft, Premium, BOX e recompensas com fluxos próprios não foram todos convertidos para execução local. A fila econômica global em lote e a compra totalmente offline continuam pendentes do objetivo original. **A confirmação econômica definitiva ainda depende do servidor.**
