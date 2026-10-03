# Changelog — Stellar Legacy

O projeto usa um único changelog consolidado. Os arquivos `CHANGELOG_Vx_y.md` antigos foram removidos do pacote; o histórico completo continua disponível no Git.

## Baseline V10.10.1
Conta online, save cloud, facções, mapas, NPCs, Hangar, equipamentos, P.E.T., missões, Galaxy Gate, ranking, leilão, PvP e Arena foram consolidados como base do jogo.

## V11
- Arena cinematográfica calculada no servidor.
- Sistema de patentes e ranking.
- Administradores ficam fora dos rankings públicos.
- Clãs/alianças e TAG no nome dos pilotos.
- Recompensas de nível e Passe de Batalha.

## V12
- Loja Premium em modo de teste ADM.
- Passe FREE + PREMIUM e Solace no Tier 30 Premium.
- PREMIUM mensal com benefícios de reparo, regeneração, míssil e descontos.
- Equipamentos só podem ser alterados na base.
- Microzona neutra de NPC ao redor dos portais.
- Clã LV1–10, rendimento diário, coleta automática de 10% e taxa de 5% em transferências.

## V12.1 — P.E.T. Autônomo
- Alcance de coleta passa a acompanhar o radar do minimapa.
- Assistência prioritária ao alvo atacado pelo jogador.
- Patrulha e escolta independente.
- Combate automático quando não há tarefa de coleta.

## V12.1.1 — P.E.T. Inteligente + Cleanup
- Velocidade do P.E.T. reduzida em patrulha, coleta, escolta e combate.
- Aproximação desacelera perto do objetivo para eliminar o efeito de vai-e-volta.
- BOX e pedras são escolhidas pela distância ao próprio P.E.T., desde que estejam dentro do radar do jogador.
- O alvo de coleta fica travado até ser coletado, expirar ou sair do radar; o P.E.T. não troca de objetivo a cada frame.
- Patrulha usa trajetos menores e troca de waypoint com menos frequência.
- Alvos automáticos de combate também ficam estáveis enquanto forem válidos.
- Changelogs por versão, SQL histórico, documentação obsoleta e página de catálogo de assets não usada foram removidos do release.
- Backend de referência consolidado em `sql/CURRENT_BACKEND.sql`.
