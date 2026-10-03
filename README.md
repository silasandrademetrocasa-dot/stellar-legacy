# Stellar Legacy — V13.0.0 • Combat Ascension

A V13 transforma o combate em um sistema mais ativo e menos automático, preservando os saves antigos e sem exigir migration nova de banco. O save JSON passa a aceitar os novos campos de habilidade automaticamente.

## O que entrou na V13

- **Habilidades ativas de nave** com HUD próprio e atalho `E`.
  - **Suporte** — Nano Restore: recupera HP e escudo instantaneamente.
  - **Tanque** — Fortress: reduz fortemente o dano recebido por alguns segundos.
  - **Controle** — JAM Pulse: silencia NPCs próximos e aumenta a mobilidade temporariamente.
  - **Dano contínuo** — Singularity: aplica pulsos sucessivos no alvo.
  - **Assalto** — Overdrive: aumenta dano e velocidade por tempo limitado.
- **Kamikaze do P.E.T. virou habilidade ativa** com botão dedicado e atalho `K`. Ele não aparece mais como modo permanente de coleta/combate.
- **BOSS em três fases**: abaixo de 66% entram em Fúria e abaixo de 33% entram em Overdrive, ganhando velocidade, dano e cadência. A terceira fase também dispara um pulso de ameaça quando o jogador está próximo.
- **HUD de BOSS** com barra de vida/escudo total e indicação da fase atual.
- **Galaxy Gate ALFA / BETA / GAMMA** no mesmo Materializador.
  - ALFA: 34 peças, 8 rounds, dificuldade 100%, recompensa total 3X.
  - BETA: 48 peças, 9 rounds, dificuldade 130%, recompensa total 4X; libera após concluir ALFA.
  - GAMMA: 64 peças, 10 rounds, dificuldade 165%, recompensa total 5X; libera após concluir BETA.
- BETA e GAMMA têm mapas próprios, waves próprias e recompensas maiores de Log-Disks.
- Cooldown da habilidade da nave é salvo para evitar reset por refresh.

## Atalhos de combate

- `CTRL` — Laser
- `ESPAÇO` — Míssil
- `E` — Habilidade ativa da nave
- `K` — Kamikaze do P.E.T.
- `J` / `ENTER` — Portal próximo

## Compatibilidade

Saves V12.x/V12.1.x continuam compatíveis. Os novos protocolos BETA/GAMMA e `combatAbilities` são criados automaticamente quando um save antigo é carregado. Nenhuma alteração no Supabase é necessária apenas para a V13, porque o estado novo fica dentro do save JSON já existente.

## Estrutura do pacote

```text
package.json
public/
server/
sql/CURRENT_BACKEND.sql
render.yaml
CHANGELOG.md
README.md
AUDIT_V13.0.0.md
ROADMAP_AFTER_V13.md
```

## Próxima evolução recomendada

A base ideal para a V13.1/V14 é: **Guerra de Clãs**, **World Boss cooperativo**, habilidades com níveis/raridades, eventos semanais de mapa e temporadas com modificadores globais. Veja `ROADMAP_AFTER_V13.md`.
