# V120.0 RC - Cumulativa V119.0 a V120.0

**Versao tecnica:** 47.7.60. **Base:** projeto completo recebido em 04/11/2026 + V119.2. **Tipo:** patch incremental para Instalador Universal; sem artes nem APK. **Status:** candidata a homologacao, NÃO finalizada como migracao integral do save.

## Escopo efetivamente implementado

- V119.0/1/2 herdadas: cabecalho de revisao, capturas opcionais, checkpoints A/B/C, logs e diagnósticos, telemetria e leitura do estado oficial.
- V119.3: gate HTTP por conta para evitar claims simultâneos no mesmo Render; falha/rejeicao nao apaga o cache de Farm; SQL de auditoria de sessoes virando o dia (read-only).
- V119.4: coalescing simultâneo de pedidos do mesmo usuario/hora/lote; preserva RPC transacional V118.2 e lock de compra; script read-only para analisar funcoes competitivas.
- V119.5: bloqueio fail-safe de `enforce` enquanto houver qualquer modulo no mapa de migracao marcado `false`; SQL de verificacao de saves/head/checkpoints/Farm/trigger, sem mutacao.
- V120.0: RPC read-only de readiness, acesso exclusivamente `service_role`, endpoint GET `/api/admin/save/v120/readiness` restrito a ADM, retornando revisoes, integridade e bloqueadores. Não disponibiliza funcao de ativacao.

## Migracao ainda NAO concluida

O estado canonico permanece em `game_saves`, mas NPC/minerio, missoes, Passe, Farm, compras/vendas, leilao, clãs, PvP, reles, eventos e cupons ainda podem modificar via RPCs próprias. Não houve substituicao dessas RPCs por comandos tipados V119, nem teste real de 8h, duas contas e concorrencia no DB de homologacao. Por isso o gate **sempre permanece observe** nesta entrega. Scripts de auditoria e RLS nao significam que a economia ja tem um unico validador.

## Ordem segura

1. Fazer backup imutavel do banco (game_saves, profiles, leilao, farm, ledgers, checkpoints) e garantir ausencia de Farms ativos.
2. Aplicar UM ZIP cumulativo V120 RC em base 47.7.60; testar o Render sem mudar env do save.
3. Em **homologacao**, aplicar preparacoes antigas se ainda nao instaladas: `sql/STELLAR_V119_0_SAVE_UNICO_PREPARAR.sql`, `sql/STELLAR_V119_1_CAPTURA_ADAPTATIVA_PREPARAR.sql`, depois `sql/STELLAR_V120_0_READINESS_RPC_PREPARAR.sql`.
4. V119.1 `CAPTURA_ATIVAR` e script proprio e opcional para ambiente de teste; nunca ativar se o Farm estiver em andamento, e monitorar P95/P99 e writes.
5. Executar SQLs read-only V119.3 / .4 / .5; chamar `/api/admin/save/v120/readiness`. O campo `safeToPromote` deve permanecer `false`.
6. Testes reproduziveis: Farm de oito horas cruzando meia-noite + replay, duas contas no mesmo mapa/relé/PvP; comprar/vender e reconectar; trocar CONF1/CONF2 e reiniciar; liquidar leilao duas vezes; simular falha de rede e checar journal A/B/C sem recompensa dupla.
7. Em teste automatizado, rodar `node --test tests/v119*.test.mjs tests/v120*.test.mjs`; rodar o conjunto do projeto apos aplicar o patch.

## Criterio de entrega definitiva V120.0 (ainda nao cumprido)

- Todas RPCs antigas convertidas e bloqueadas contra gravacao independente.
- Um `operation_id` e um recibo unico por transacao; debit/credito/loot/estado/log/A/B/C no mesmo commit.
- Testes E2E em Supabase e Render, incluindo duas contas e Farm 8h, sem perdas nem duplicacao.
- Monitor sem impactos P95/P99 relevantes; plano de rollback sem reverter progresso confirmado.

**Aviso:** um patch de codigo nao comprova os criterios acima sem migracao/execucao real e homologacao.
