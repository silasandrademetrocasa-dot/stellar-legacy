# Stellar Legacy V12.1.7 — Pente-fino técnico

## Correções aplicadas

### AUX-9 — Nova Burst
- Nova Burst deixou de ser um modo de explosão recorrente e passou a ser uma ativação única.
- Selecionar Nova Burst arma exatamente 1 carga.
- A carga é consumida antes do dano ser aplicado, bloqueando reentrada/repetição no mesmo ciclo do game loop.
- Após a explosão, o AUX-9 volta automaticamente para Companhia.
- Recarga: 15 segundos.
- A recarga é persistida no save (`kamikazeReadyAt`), então refresh/reload não reseta o cooldown.
- Trocar para BOX, Pedras, Guardião, Reparo ou Companhia cancela imediatamente qualquer carga pendente.
- Troca de mapa/Portal Astral também cancela carga pendente.
- Save antigo que estava com Nova Burst ativo volta para Companhia ao carregar; nunca nasce armado sozinho.
- O dano continua sendo AOE em uma única explosão, como comportamento original do módulo.

### Versionamento/cache
- HTML, CSS query, game.js, data.js, api.js, manifest, package.json e servidor alinhados em V12.1.7.
- `/health` e `/api/meta` agora reportam V12.1.7.
- O identificador SQL `v1214` do sistema de sessão única foi mantido de propósito para preservar compatibilidade com o banco existente.

## Validações executadas
- `node --check` em game.js, api.js, data.js, manifest.js e server/index.js: OK.
- IDs duplicados no HTML: nenhum.
- Funções nomeadas duplicadas: nenhuma.
- Imports usados de api.js sem export correspondente: nenhum.
- Assets locais diretamente referenciados e ausentes: nenhum.
- Balanceamento básico de chaves CSS: OK.
- package.json válido e versão 12.1.7.
- Guardas do Nova Burst verificadas por assertiva estática.

## Sistemas revisados sem alteração destrutiva
- Login único / game_session_id.
- Save local + save cloud.
- Persistência de mapa e posição.
- Reparação automática HP/escudo.
- AUX-9 Guardião, BOX, Pedras e Reparo.
- Munição, mísseis e auto-buy.
- Hangar, inventário, drones e equipamentos.
- Missões, nível e Battle Pass.
- Portal Astral AURORA.
- Arena PvP e presença online.
- Ranking/patentes.
- Leilão.
- Clãs e economia de clã.
- Loja Premium em modo de teste ADM.

## Pontos de atenção encontrados
- Existem alguns seletores de UI opcionais herdados de layouts anteriores. Todos os acessos relevantes estão protegidos contra `null`; não removi para evitar quebrar HUDs/elementos gerados dinamicamente.
- O arquivo principal do jogo já passa de 4.600 linhas. Está funcional, mas a próxima etapa técnica ideal é modularizar AUX-9, combate, missões, Arena, clãs e UI em arquivos separados para diminuir risco de regressão.
- O projeto ainda não possui suíte automatizada de testes de gameplay. Os checks atuais são estáticos/smoke; vale criar testes de regras críticas antes de aumentar o online.

## Sugestões para a próxima versão

### Prioridade alta — qualidade de gameplay
1. **Barra de habilidades ativa**: transformar Nova Burst e futuras skills em botões com ícone, cooldown circular e tecla própria. Evita misturar habilidade de uso único com modos persistentes do AUX-9
2. **Habilidades reais das naves**: várias naves já têm descrição de ability; implementar cooldowns e efeitos ativos deixaria cada nave realmente diferente.
3. **Sistema de ameaça/aggro de NPC**: NPC reagir por distância, dano recebido e tipo de nave/AUX-9; bosses com fases e padrões diferentes.
4. **Feedback de combate**: crítico, miss, shield break, kill streak e efeitos diferentes para laser/míssil/Nova Burst.
5. **Painel de cooldowns**: míssil, Nova Burst, habilidade da nave e módulos em um único HUD compacto.

### Prioridade alta — conteúdo
6. **Portal Astral NEXUS/ECLIPSE** com peças próprias, dificuldade e recompensas exclusivas.
7. **Boss mundial / evento de setor** que nasce em horário/ciclo e exige vários jogadores ou guilda.
8. **Guerras de clã** com declaração, duração, placar e recompensa semanal.
9. **Refino/crafting de recursos**: pedras comuns → ligas/recursos especiais → upgrades temporários ou itens.
10. **Equipamentos com raridade/nível** sem virar pay-to-win: melhoria por materiais, limite e custo progressivo.

### Prioridade média — retenção
11. **Login diário de 7/30 dias** e calendário de eventos.
12. **Conquistas e títulos** visíveis no nome/ranking.
13. **Temporadas PvP** com reset parcial e cosméticos/recompensas não destrutivas.
14. **Contratos dinâmicos**: caçada, escolta, mineração em zona hostil e defesa de portal.
15. **Coleção/códice** de NPCs, naves, mapas e drops descobertos.

### Prioridade técnica
16. **Modularizar game.js** em `pet.js`, `combat.js`, `missions.js`, `arena.js`, `clans.js`, `ui.js`.
17. **Testes automatizados** para compra/saldo, save/load, portal, morte/reparo, Nova Burst, Arena e sessão única.
18. **Modo diagnóstico ADM** com FPS, ping, save status, mapa/coords, número de NPCs e última chamada API.
19. **Rate limit e validação server-side** para ações online/economia conforme o multiplayer crescer.
20. **Telemetria de erros** sem dados sensíveis para descobrir bugs reais por versão.

## Recomendação para V12.2
Uma V12.2 forte seria: **Habilidades Ativas + HUD de Cooldowns + Skills reais das naves + Nova Burst como botão**, preparando a base para bosses com fases e PvP mais profundo.
