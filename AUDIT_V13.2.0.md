# AUDIT V13.2.0 — EVENT DOMINATION

## Frontend / HUD
- Topo reorganizado em 7 grupos principais.
- Habilidades movidas para o topo.
- Minimapa fixado no canto inferior direito.
- Barra de armas/munições compactada no rodapé esquerdo.
- IDs do HTML validados sem duplicidades.

## Mapas 4-X
- 4-1 (`b41`), 4-2 (`b42`) e 4-3 (`b43`) marcados como `eventOnly`.
- `enemyGroups` vazio e `enemyMultiplier` zero nos três mapas.
- `spawnEnemies()` e `scheduleEnemyRespawn()` bloqueiam NPCs comuns em mapas `eventOnly`.
- NPCs de evento são injetados apenas enquanto existe evento ativo.

## Fluxo de eventos
- World Boss diário rotaciona pelos setores 4-X.
- Eventos futuros podem ser agendados com status `scheduled` e ativam automaticamente ao chegar a janela.
- Não é permitido sobrepor dois eventos no mesmo 4-X na mesma janela.
- `config.npc_groups` permite eventos futuros com NPCs existentes, quantidade, multiplicadores e pontos de dominação.

## Dominação de mapa entre clãs
- Placar separado por evento e por clã.
- Pontuação por World Boss, PvP e NPCs de evento.
- Ao final do evento, o líder assume o domínio daquele setor.
- Domínio persiste até nova disputa.
- Bônus atual do domínio: +10% CR/URI e +1 fragmento na recompensa do World Boss do território.

## Verificações executadas
- `node --check` em `public/game.js`, `public/api.js`, `public/data.js` e `server/index.js`.
- Migração V13.2 aplicada no Supabase de produção.
- RPC `get_warfront_state_v132` testada como usuário autenticado.
- Pontuação de dominação testada em transação com rollback.
- Dano do World Boss V13.2 testado em transação com rollback; HP de produção preservado.
- Agendamento de evento futuro + `npc_groups` testado em transação com rollback.
