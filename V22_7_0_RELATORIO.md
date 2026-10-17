# Relatório técnico — Blindagem de escrita e economia

## Implementado

- Save online e atualização do espelho econômico passam exclusivamente pelo cliente de serviço do Render.
- SQL B revoga `INSERT/UPDATE/DELETE` diretos da tabela `game_saves` para usuários da API.
- SQL B restringe `profiles` a criação de perfil/callsign; progresso e saldos são espelhados pelo servidor.
- Compras/serviços executados no Render incrementam `serverPurchaseRevision`; save antigo não pode retroceder essa revisão.
- WebSocket combate NPC valida usuário vivo/conectado, replay de disparos e um orçamento acumulado por conexão (sem autoban de rede).
- Eventos, conquistas, programas anteriores, sprites e configurações de nave permanecem na mesma base.

## Banco e cronologia

A primeira migração, apenas `GRANT` ao servidor, foi executada e verificada. O SQL de revogação fica pendente **até o Render usar o novo código**. Esta separação impede indisponibilidade do save no ambiente atual.

## Risco residual / próxima entrega

- Rewards de missões, eventos, exploração, alguns drops e passes antigos ainda calculados no cliente.
- Clientes maliciosos ainda poderiam fraudar pequenos saldos via `/api/save` se ultrapassarem a validação heurística. Bloquear a escrita REST não torna a API HTTP autoritativa sozinha.
- Ataques ainda fornecem dano do cliente; validação estrita de build/cooldowns e munição no servidor depende de migração do combate.
- Concorrência econômica entre múltiplas instâncias precisa migrar para RPC transacional com idempotência antes de cobranças reais.

**Não anunciar o jogo como à prova de hacking; este pacote reduz significativamente as superfícies de escrita direta e replays e prepara a migração integral.**
