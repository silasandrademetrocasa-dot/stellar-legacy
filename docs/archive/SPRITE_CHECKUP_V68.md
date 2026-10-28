# V68 — Varredura de sprites NPC

## Problemas encontrados
Foram identificados sprites com fragmentos soltos/desconectados, causando enquadramento ruim, escala inconsistente e leitura estranha in-game.

## Sprites corrigidos
- aiderStreuner
- bossMordon
- bossNexusWarden
- bossRiftMauler
- bossRiftScout
- devolarium
- mordon
- recruitStreuner
- saimon
- sentinelScavenger
- sentinelScout
- sentinelSupport
- sibelon
- voidCorsair

## Ajuste aplicado
1. Remoção de componentes desconectados pequenos/soltos.
2. Recorte usando o componente principal.
3. Recriação do canvas com padding uniforme para manter o sprite centralizado.
4. Preparação como base acumulativa para a próxima versão com mapas novos.

## Revisão extra antes do pacote modular V2
Os quatro sprites `apexOverlord`, `sentinelScavenger`, `sentinelScout` e `sentinelSupport` foram reenquadrados a partir da prancha transparente original para corrigir regiões de sobreposição entre colunas. A integridade final ainda deve ser avaliada visualmente no navegador após o deploy.
