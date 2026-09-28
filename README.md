# Stellar Legacy V9.3 — Mission Protocol

Grande atualização de conteúdo sobre a base V9 Expedition. Mantém os mapas expandidos e adiciona densidade maior de NPCs e um sistema persistente de missões com aceite manual.

## Destaques V9.3

- Mais inimigos para preencher os mapas gigantes da V9.
- X-1: ~48 NPCs; X-2: ~70; X-3: ~65; X-4: ~60; mapas 4-X: ~64–67 NPCs.
- Novo botão **MISSÕES** na barra superior.
- Categorias: **Diária, Semanal, Mensal e Especial**.
- O objetivo só começa a contar depois de clicar em **ACEITAR**.
- Apenas **1 missão ativa por categoria**; até 4 simultâneas no total (uma de cada categoria).
- Missões aceitas e progresso ficam dentro do save local/cloud.
- Missões diárias, semanais e mensais usam ciclos próprios; especiais são permanentes.
- Progresso integrado a eliminações, bosses, mapas 4-X, coleta de minério e exploração.
- Recompensas em Créditos, Uridium e XP.
- Missões completas exigem **RESGATAR** para liberar a vaga da categoria.
- Missão pode ser abandonada; o progresso daquela tentativa é perdido.
- Correção interna dos seletores do painel recolhível da nave.

---

Grande atualização baseada na V8.3 Identity Build, mantendo Node.js + Express + Supabase e evoluindo o jogo para mapas muito maiores, exploração real e combate mais vivo.

## Destaques da V9

- todos os mapas foram ampliados de forma agressiva
- mapas baixos agora vão de **6.000×4.500** até **7.800×5.600**
- Battle Maps chegam a **11.200×8.000**
- posições de portais foram refeitas para as novas dimensões
- saves antigos são migrados proporcionalmente para o novo tamanho de mapa
- quantidade de NPCs e minérios aumentada para preservar densidade sem lotar o celular
- NPCs passam a surgir em torno de pontos de interesse, formando zonas de caça
- landmarks de exploração foram adicionados: beacons, destroços, anomalias e pontos de varredura
- grid de setor no canvas para dar escala e sensação de deslocamento
- coordenadas da nave e distância até o destino agora aparecem na HUD
- clique no minimapa traça uma rota visual até o destino
- seta de navegação aparece na tela quando o waypoint está fora do campo de visão
- minimapa maior e com grade, landmarks, portais, radar e rota
- backgrounds usam recorte dinâmico baseado na posição da câmera, mudando conforme o jogador atravessa o mapa
- radar ampliado para os mapas maiores
- alcance de laser e míssil ajustado para a nova escala
- seleção de NPC melhorada para sprites maiores
- explosões, impactos, escudo e partículas novos
- mísseis agora possuem efeito visual de trajetória
- bosses recebem explosões maiores e aura visual mais forte
- culling de objetos fora da tela para reduzir custo de renderização no celular
- identidade visual, sprites, equipamentos, drones, P.E.T., recursos, loot e fundos da V8.3 continuam integrados

## Dimensões dos mapas

| Mapa interno | Tamanho V9 |
| --- | --- |
| X-1 | 6000 × 4500 |
| X-2 | 6600 × 4800 |
| X-3 | 7200 × 5200 |
| X-4 | 7800 × 5600 |
| 4-1 | 9800 × 7000 |
| 4-2 | 10400 × 7400 |
| 4-3 | 11200 × 8000 |

A numeração exibida continua respeitando a facção: Terra 1-X, Marte 2-X e Júpiter 3-X.

## Identidade visual

Os assets continuam organizados em:

```text
public/assets/v8/
  ammo/
  backgrounds/
  branding/
  drones/
  equipment/
  loot/
  npcs/
  resources/
  ships/
  manifest.js
```

O nome da pasta foi mantido para compatibilidade com a V8.3 e para evitar duplicar dezenas de imagens no deploy.

O catálogo visual continua disponível em:

`/asset-catalog.html`

## Stack

- Node.js 18+
- Express
- Supabase
- HTML/CSS/JavaScript Canvas 2D

Não foi necessário adicionar PHP ou C#. O gargalo atual é gameplay/renderização no navegador, e a stack atual é mais simples para Render + Supabase e permite deploy direto pelo Git.

## Render

Variáveis esperadas:

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`

## Validação

Antes de empacotar a release:

- `public/game.js` → `node --check`
- `public/data.js` → `node --check`
- `public/assets/v8/manifest.js` → `node --check`
- `server/index.js` → `node --check`

Release: **9.0.0**