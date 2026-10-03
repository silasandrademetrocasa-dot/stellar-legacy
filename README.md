# Stellar Legacy — V12.1.4

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


## Hotfix V12.1.2 — Persistência de mapa e posição
- Salva as coordenadas reais da nave antes de cada persistência local/cloud.
- Guarda posição separada por mapa e facção territorial.
- Troca de portal força sincronização cloud imediata.
- Ao recarregar, usa a posição salva do mapa atual em vez de reaproveitar coordenadas de outro mapa.
- Se o save local deste navegador for mais novo que o cloud, ele é usado e enviado ao servidor, evitando rollback durante refresh/deploy.
- Ao ocultar/fechar a página, força save da posição atual antes da sincronização.


## V12.1.3 — P.E.T. Guardião + Venda Segura

- Modo Guardião usa o mesmo alcance de ataque laser da nave (900u normal / 1250u em mapas de batalha).
- Alcance dos módulos de coleta BOX/Pedras reduzido para 50% do raio do minimapa.
- Venda de equipamento e drones exige confirmação explícita antes de remover o item.

## V12.1.4 — Login Único

A conta possui uma única sessão de jogo ativa. Cada login recebe um `game_session_id` próprio e o Supabase mantém apenas o mais recente por usuário. Um novo login substitui o anterior; a sessão antiga é detectada pelo cliente em até poucos segundos, perde acesso aos endpoints protegidos e volta para a tela de login. O save local da sessão revogada é removido para impedir conflito com o progresso do dispositivo mais novo.

