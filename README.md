# Stellar Legacy — V12.1.1

Versão atual consolidada do Stellar Legacy. O pacote foi limpo para manter somente arquivos necessários ao jogo, documentação atual e um snapshot único do backend. O histórico completo das versões permanece no Git.

## Principais sistemas

- autenticação e save cloud via Supabase
- mapas, portais, facções, NPCs e bosses
- Hangar, armas, escudos, motores, drones e P.E.T.
- missões, recompensa de nível e Passe de Batalha FREE/PREMIUM
- Galaxy Gate, Arena PvP, ranking e patentes
- clãs LV1–10 com economia diária
- Loja Premium em modo de teste para ADM
- equipamentos alteráveis somente na base e microzonas neutras em portais

## P.E.T. V12.1.1

O P.E.T. usa o raio do minimapa como área operacional. Em modos de coleta ele escolhe o item válido mais próximo de sua posição atual, trava esse objetivo até concluir a tarefa e se move em velocidade reduzida com desaceleração na chegada. Quando o piloto ataca, o mesmo alvo vira prioridade máxima. Sem tarefa de coleta, o P.E.T. pode auxiliar em combate e patrulhar de forma mais calma.

## Estrutura limpa

```text
package.json
public/
server/
sql/CURRENT_BACKEND.sql
render.yaml
CHANGELOG.md
README.md
```

As migrations e changelogs históricos não fazem parte do ZIP atual porque permanecem recuperáveis pelo histórico do Git.
