# V119.4 - leilão concorrente e auditoria competitiva

- Requisicoes HTTP de liquidacao para o **mesmo jogador/hora/lote** compartilham a mesma Promise no processo Render.
- Toda cobranca e premiacao continua exclusivamente na RPC `stellar_settle_auction_bid_v1182`; transacoes entre Render workers e usuarios sao protegidas somente pelos locks no banco.
- Script SQL read-only inventaria permissoes e funcoes de leilao, clãs, PvP e reles, sem editar ou liberar recompensas.
- **Nao concluidos:** migracao transacional de clãs, PvP, reles e todas RPCs de recompensa ao gateway V119; requer testes reais com duas contas.
