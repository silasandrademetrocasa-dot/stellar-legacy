# Stellar Legacy V125.0 — Cumulativa econômica, idempotência e reconciliação

## Alterações implementadas
- Rotas `POST /api/economy/action` e `POST /api/live/purchase/bulk` passam a usar recibos SQL duráveis para clientes com `request_id`.
- Recibos reexecutados retornam estado confirmado, sem recriar pagamento ou despesa.
- Hash SHA-256 da intenção da operação impede reuso do identificador com outro pedido.
- RPC SQL transacional aplica save, perfil, checkpoint e recibo, com lock por jogador e comparação de `game_saves.updated_at`.
- O cliente guarda o identificador localmente e limpa só após resposta do servidor (ou erro definitivo). Uma falha de conexão conserva a intenção para retentativa.
- Mantém compras de catálogo V123, sincronização local-first V122 e recuperação de Farm V123.

## Limitações importantes
- Esta versão NÃO converte RPCs de NPC, missões, passe, PvP, clãs, leilão e Warfront em um writer único. Essas áreas seguem suas próprias RPCs antigas. O Farm continua pago pela RPC original.
- A economia de Créditos e STL continua sendo validada no Render/Supabase; cache local não concede saldos nem itens novos.
- Clientes antigos sem `request_id` usam o fluxo legada. NÃO ativar `STELLAR_SAVE_V119_MODE=enforce` até migração completa e testes reais.
- O mecanismo de reconciliação por timestamp evita gravações sobre estado concorrente, mas pode recusar transação com `ECONOMY_STALE`: confirmar progresso e repetir.
- Requer teste de integração no Android/Render depois do deploy, especialmente resgates prolongados e concorrência entre contas.

## Procedimento de publicação
1. Fazer backup do banco.
2. Aplicar `sql/STELLAR_V125_0_ECONOMY_OPERATION_RECEIPTS.sql` (DDL aditivo e não destrutivo) antes do deploy.
3. Fazer apenas 1 deploy com este ZIP pelo Instalador Universal.
4. Conferir `GET /health` e versionamento do app.
5. Fazer teste curto de venda, compra em lote, reiniciar, reenviar mesma requisição, resgatar Farm curto.

## Roadmap posterior
- Converter as RPCs de recompensas NPC, missões e Passe para operações conciliáveis com a revisão.
- Unificar liquidação de leilão, PvP, relés/clãs e Warfront mantendo autoridade online.
- Retirar o código legado somente quando todos os escritores forem auditados e os testes reais passarem.
