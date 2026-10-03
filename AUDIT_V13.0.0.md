# Auditoria V13.0.0

## Verificações executadas

- `node --check` em `public/game.js`, `public/api.js`, `public/data.js`, `server/index.js` e manifest de assets.
- Nenhum ID HTML duplicado.
- Todos os imports usados de `api.js` possuem export correspondente.
- 130 caminhos declarados no manifest de assets conferidos; nenhum arquivo faltando.
- Mapas `ggAlpha`, `ggBeta` e `ggGamma` presentes.
- Estruturas de `GALAXY_NEXUS_ROUNDS` e `GALAXY_ECLIPSE_ROUNDS` presentes.
- Framework `SHIP_ABILITIES`, `updateBossPhase` e `triggerPetNova Burst` presente no bundle.
- Versão principal alinhada em `index.html`, `game.js`, `server/index.js` e `package.json` como `13.0.0`.

## Compatibilidade

A V13 não muda o formato físico da tabela de saves no Supabase. Os campos novos vivem no JSON do save e são normalizados ao carregar.

## Observação

Existem referências opcionais/legadas de HUD no `game.js` cujos elementos não estão no HTML atual. Elas usam verificações nulas e já existiam na base; não são erros de execução introduzidos pela V13.
