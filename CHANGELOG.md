# Changelog — Stellar Legacy

Este arquivo substitui os changelogs individuais antigos. O detalhe completo das versões anteriores continua preservado no histórico do Git.

## Baseline V10.10.1 — Release Candidate

A V10.10.1 foi definida como a nova base consolidada do projeto. Ela reúne o jogo já funcional: conta online, save cloud, facções, mapas, NPCs, hangar, equipamentos, P.E.T., missões, Galaxy Gate, ranking, leilão, PvP, Arena com limite diário e recompensa por liga.

A partir desta baseline, não mantemos mais um arquivo `CHANGELOG_Vx_y.md` para cada incremento antigo.

## V11.0.0 — Arena Cinemática

- nova RPC `arena_attack_v11`
- combate da Arena calculado no servidor com log de eventos
- LCB-10 (X1) fixa
- R-310 fixo a cada 4 rounds
- escudo e HP tratados separadamente
- animação tiro a tiro no cliente
- laser, míssil, impacto e dano flutuante
- barras de escudo e HP durante a luta
- cronômetro e round atual
- feed de combate
- opção de pular animação
- relatório final de dano e duração
- análise tática baseada nos atributos dos dois pilotos
- limpeza dos changelogs e migrations antigas do diretório principal
