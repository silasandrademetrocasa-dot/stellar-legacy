# V34.4.2 — Multiplayer Motion Hotfix

## Problema relatado
Com dois ou mais pilotos na mesma visão, a nave remota sofria saltos e mudanças bruscas de movimento. Os NPCs já estavam suaves na V34.4.1.

## O que foi alterado
- `public/modules/multiplayer-motion-v3442.js`: buffer de 6 posições por piloto, atraso visual de 160ms, interpolação em sequência e previsão visual limitada a 65ms. Suporte a ângulos que cruzam -π/π e teleporte sem animação incorreta.
- `public/game.js`: os pilotos remotos usam esse buffer, em vez da previsão antiga de 55ms sobre o último snapshot. Presença no Supabase é um fallback e não deve substituir snapshots WebSocket recentes. Snapshots antigos não voltam a nave no tempo.
- `tests/remote-pilot-motion-v3442.test.mjs`: simula dois pilotos, pacotes irregulares, movimento em eixo único, salto no mapa e chegada fora de ordem.

## Segurança e compatibilidade
Somente interpolação visual das naves remotas. Não altera dano, posição autoritativa do servidor, movimento local, economia, saves, eventos nem SQL. Não exige deploy manual no Render, que recebe o código via GitHub depois da instalação do ZIP.

## Validação real
Testar dois pilotos visíveis no mesmo setor (perseguir, cruzar trajetórias, parar/acelerar e PvP), FPS no celular e intervalo de renderização. Nenhum teste automatizado garante fluidez em rede real.
