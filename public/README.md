# Stellar Legacy V9.8 — Dynamic Mission Flow

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

## V9.4 — Progress Protocol
- Diárias: somente caçadas de NPC específico.
- Semanais: somente caçadas de NPC específico.
- Mensais: única categoria que permite eliminações gerais.
- Especiais: nova campanha permanente de progresso em 8 etapas.
- Cada etapa especial exige a conclusão da anterior.
- Continua valendo a regra de 1 missão ativa por categoria.
- O progresso só começa depois de ACEITAR.


## V9.5 — Reward Protocol
- A recompensa de missão agora é dinâmica.
- Cada eliminação válida adiciona ao prêmio da missão 50% dos Créditos, Uridium e XP que aquele NPC realmente concede.
- Missões de NPC específico usam exatamente os NPCs pedidos.
- A missão mensal de matança geral calcula o bônus com base nos inimigos realmente abatidos, então NPCs mais fortes aumentam o prêmio.
- O painel mostra o bônus acumulado em tempo real.
- Recompensas fixas antigas deixaram de ser usadas no resgate.


## V9.6 — Mission Arsenal
- Diárias: exatamente 3 contratos por dia, sorteados deterministicamente.
- 1 diária de NPC aleatório: 100 normal ou 50 BOSS.
- 1 diária de pedra aleatória: 500 unidades.
- 1 diária conjunta: 50 + 50 NPCs comuns diferentes + 10 BOSS.
- Semanais: 10 contratos para cada NPC e cada pedra com metas 10/25/50/100/150/200/250/500/750/1000.
- Mensais: mesma estrutura da semanal com metas 10x maiores.
- Especiais: 1 contrato de 10 eliminações para cada NPC, contratos de pedra, 5 mistos de NPC, 5 BOSS solo, 5 BOSS mistos e 6 híbridos NPC + pedra.
- Missões especiais pagam 100% da soma dos ganhos dos alvos; diárias/semanais/mensais continuam pagando 50%.
- Parte das missões compostas é sequencial: uma tarefa precisa ser concluída para desbloquear a próxima.
- Painel ganhou busca e filtro por NPC/BOSS/PEDRAS/MISTAS/NPC+PEDRA.


## V9.7 — Galaxy Gate Alpha

### Montagem
- 34 peças únicas para montar o portal ALFA.
- Cada sorteio do materializador custa 10 Uridium.
- Botões: 1x, 5x, 10x, 50x e 100x.
- Possíveis resultados: peça ALFA, LCB-10, MCB-25, MCB-50, UCB-100, R-310, PLT-2026, PLT-2021, PLT-3030, Xenomit, Créditos, Bônus de Salto e Bônus de Reparo.
- Bônus de Reparo já pode ser consumido na base para reparar HP e escudo completamente.

### Combate
- 8 rounds.
- 3 vidas por tentativa.
- Morrer no ALFA devolve o piloto à base X-1 e mantém mortos os NPCs já eliminados.
- O piloto precisa saltar novamente pelo painel Galaxy Gate para continuar.
- Ao perder as 3 vidas, o ALFA é perdido e precisa ser remontado.

### Ondas
1. 4x 10 Streuners
2. 4x 10 Lordakias
3. 4x 10 Saimons
4. 4x 10 Mordons
5. 10 Boss Streuners → 10 Boss Lordakias → 10 Boss Saimons → 10 Boss Mordons
6. 4x 5 Devolariums
7. 2x 5 Boss Devolariums
8. 10 Sibelons → 10 Sibelons → 10 Boss Sibelons → 5 Boss Sibelons

As ondas têm 10 segundos entre elas.

### Recompensa
- As eliminações dão os ganhos normais durante o portal.
- Ao completar o ALFA, o jogo concede +200% adicionais dos Créditos, Uridium e XP obtidos pelos NPCs do gate.
- Total final de recompensa direta dos NPCs: 3X.


## V9.8 — Dynamic Mission Flow
- Semanais e mensais exibem somente o próximo degrau por NPC/pedra.
- Missão concluída some da tela e a recompensa entra automaticamente.
- Animações de MISSÃO COMPLETA e LEVEL UP.
- Drones e P.E.T. mais afastados da nave.
- P.E.T. usa a mesma munição laser selecionada pela nave, 1 munição por laser/rajada, com Auto Buy compatível.


## V9.8.1 — Gate Timing Fix
- Dentro de cada Round, as ondas continuam aparecendo automaticamente a cada 10 segundos, mesmo que ainda existam NPCs da onda anterior.
- O próximo Round NUNCA começa enquanto houver qualquer NPC vivo do Round atual.
- Depois que a última onda do Round já apareceu e todos os NPCs daquele Round forem eliminados, inicia uma contagem de 10 segundos.
- Após esses 10 segundos, a primeira onda do próximo Round aparece.
- As ondas seguintes desse novo Round continuam entrando de 10 em 10 segundos.


## V9.8.2 — Gate UI Fix
- Modal do Galaxy Gate agora abre acima do HUD/topbar, sem ficar escondido atrás da logo.
- A janela do portal foi ancorada com espaçamento superior adequado e scroll próprio.
- Header do modal do portal ficou sticky para facilitar leitura e navegação.
- Ajustes mobile para o modal do portal não colidir com a interface.
