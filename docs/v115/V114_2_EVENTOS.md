# V114.2 — Eventos automáticos e limpeza

## Entrega isolada

- Uma sala inelegível não anuncia evento como se ele estivesse ativo localmente.
- NPCs e minérios órfãos de eventos encerrados são identificados pela chave `eventId` e apagados separadamente.
- O cleanup de minérios **não limpa indevidamente NPCs do evento atual** (regressão de evento compartilhado).
- Limpeza de NPCs de evento não força um snapshot completo da sala a cada varredura. Emite apenas a lista dos IDs removidos (`event_cleanup`).
- Janelas, rotação e controle ADM existentes permanecem inalterados. Respawns atrasados de eventos encerrados continuam bloqueados.

## Aceite

Inicie, finalize e alterne eventos em B4-X e U-X, acompanhando dois jogadores. Ao terminar, nenhum NPC/minério de evento anterior deve reaparecer; NPCs normais devem permanecer. Um minério órfão não deve apagar NPCs do evento em andamento.
