# Stellar Legacy — V11.0

Base limpa de lançamento do Stellar Legacy.

A V10.10.1 foi consolidada como **baseline**: tudo que já estava funcional passa a ser tratado como parte do jogo atual, sem carregar dezenas de arquivos de changelog de V8/V9/V10 no topo do projeto. O histórico antigo continua preservado no próprio histórico do Git.

## Estado atual do jogo

- Login e conta online via Supabase
- Save local + cloud save
- Facções Terra, Marte e Júpiter
- Mapas grandes, portais, minimapa e navegação
- NPCs, bosses, loot, recursos e comércio
- Hangar, naves, lasers, geradores, extras e drones
- P.E.T. e módulos
- Missões e progressão
- Galaxy Gate Alpha
- Perfil de piloto
- Ranking e leilão
- PvP no mapa
- Arena PvP com 10 ataques diários
- Recompensa diária da Arena por liga/rating
- V11: Arena cinematográfica com combate tiro a tiro

## V11 — Arena cinematográfica

A Arena deixa de ser apenas um botão que retorna vitória/derrota. O servidor gera o combate e devolve um log de eventos. O navegador reproduz a luta visualmente.

### Regras do modo

- munição laser fixa: **LCB-10 (X1)**
- míssil fixo: **R-310**
- não existe troca de munição durante a batalha de Arena
- laser dispara em cada round
- R-310 dispara a cada 4 rounds
- escudo é consumido antes do HP
- velocidade influencia parcialmente a defesa/evasão
- máximo de 30 rounds
- limite de 10 ataques por dia continua ativo

### Visual da batalha

- duas naves frente a frente
- laser e míssil animados
- dano flutuante por disparo
- barras de escudo e HP atualizadas em tempo real
- round atual e cronômetro
- feed dos últimos impactos
- botão para pular a animação
- relatório final com duração, rounds, dano causado e recebido
- leitura tática com sugestões baseadas em laser, escudo, HP e velocidade

## Estrutura limpa

```text
.github/workflows/main.yml       ponte de deploy do projeto
public/                          cliente do jogo
  assets/                        sprites e imagens em uso
  api.js                         comunicação com Supabase
  data.js                        dados de jogo
  game.js                        gameplay e renderização
  index.html                     interface
  style.css                      visual
server/index.js                  servidor Express
sql/V11_ARENA_CINEMATIC.sql      migração nova da V11
supabase/README.md               referência do banco atual
CHANGELOG.md                     histórico consolidado
CLEANUP_GITHUB.md                guia de limpeza do repositório
package.json
render.yaml
```

## Importante sobre `public/assets/v8`

A pasta **não é um backup antigo**. O nome `v8` ficou por compatibilidade, mas vários sprites atuais ainda são carregados diretamente dela. Portanto **não apague `public/assets/v8`** apenas por causa do nome. Ela faz parte do runtime atual.

Quando quisermos, podemos fazer uma migração separada para renomear essa pasta para `assets/core`, mas isso deve ser feito alterando todos os caminhos do manifest ao mesmo tempo.

## Supabase

A V11 usa a nova RPC:

```text
arena_attack_v11(uuid)
```

O SQL está em `sql/V11_ARENA_CINEMATIC.sql`.

O projeto espera as variáveis:

```text
SUPABASE_URL
SUPABASE_PUBLISHABLE_KEY
```

## Validação antes do deploy

```bash
node --check public/game.js
node --check public/api.js
node --check public/data.js
node --check server/index.js
```

Release atual: **11.0.0**
