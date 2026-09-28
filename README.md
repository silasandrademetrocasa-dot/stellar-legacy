# Stellar Legacy V8 (base de arte + projeto)

Versão base da V8 preparada para subir no Git, usando a estrutura funcional da V7.2.1 e adicionando uma nova direção de arte para a próxima fase do jogo.

## O que entra nesta base

- projeto web funcional herdado da V7.2.1
- conceitos visuais da V8 em `public/v8-art`
- galeria rápida em `public/v8-concepts.html`
- direção para upgrade de HUD, mapas, hangar e loja

## Conceitos V8

Abra no navegador:

- `/v8-concepts.html`

## Artes adicionadas

- `public/v8-art/battle-screen-v8.png`
- `public/v8-art/map-screen-v8.png`
- `public/v8-art/hangar-store-v8.png`

## Próximos passos sugeridos

1. aplicar a nova HUD no `public/index.html` / `public/style.css`
2. integrar ilustrações de naves, NPCs e caixas como sprites reais
3. criar versões mobile compactas baseadas nesses concepts
4. refazer loja/hangar/mapas seguindo os mockups

---

# Stellar Legacy V7.2.1

Space MMO web mobile-first com login Supabase, progressão, economia, hangar, loja e mapas.

## Novidades V6.2

- Portal com botão flutuante holográfico `JUMP / SALTAR`.
- Transição animada de salto entre mapas.
- Naves com silhuetas vetoriais diferentes por modelo.
- NPCs com modelos vetoriais diferentes por família e bosses destacados.
- Nomes coloridos: jogador pela facção, NPCs hostis em vermelho suave e portais neutros em ciano.
- Minérios com cristais iluminados e cargo boxes sci-fi.
- Modal MAPAS com artes próprias, destaque do mapa atual e rotas galácticas.
- Viagem clicando em mapas liberados; níveis: X-1/X-2 lvl 1, X-3 lvl 2, X-4 lvl 3 e Battle Maps lvl 4.
- Battle Maps 4-1, 4-2 e 4-3 jogáveis, conectados por portais.
- Xenomit continua especial e não ocupa espaço no porão.
- Munição e míssil selecionados destacados por borda vermelho suave.

## Atalhos

- CTRL: laser
- ESPAÇO: míssil
- J / ENTER: saltar quando estiver em cima do portal
- M: mapas
- B: loja
- H: hangar
- C: porão
- 1-4: munição laser

## Render

Build: `npm install`

Start: `npm start`

Variáveis:
- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`

## Consumo real de munição

- Cada laser equipado na nave ou em drones consome 1 unidade da munição laser selecionada por rajada.
- Se houver menos munição do que lasers, somente os lasers cobertos pelo estoque participam da última rajada.
- Cada míssil disparado consome exatamente 1 unidade do tipo selecionado.


## V6.3 — Combate e munição em tempo real

- Dano dos NPCs normais foi rebalanceado para o HP atual das naves.
- Os valores de progressão foram ancorados nos danos máximos clássicos e escalados para o combate do Stellar Legacy.
- Bosses seguem a regra do projeto: **2x HP, 2x escudo, 2x dano, 2x créditos, 2x uridium e 2x recursos do NPC normal correspondente**.
- Xenomit continua como recurso especial adicional em bosses selecionados.
- Munição laser atualiza em tempo real a cada rajada.
- Mísseis atualizam em tempo real a cada disparo.
- O seletor mostra estoque, consumo por rajada e estimativa de rajadas restantes.
- Estoque baixo fica amarelo; estoque crítico fica vermelho/pulsante.


## V7.2.1 — Sistema P.E.T.

- P.E.T. começa no nível 1 e evolui até o nível 15.
- Nível do P.E.T. aumenta automaticamente com XP obtido em abates e coletas.
- Cada nível disponibiliza 1 novo slot potencial de arma e 1 de escudo.
- Nível 1 já começa com 1 slot de arma e 1 slot de escudo liberados gratuitamente.
- Slots dos níveis 2–15 precisam ser liberados com Uridium.
- Lasers e escudos do P.E.T. usam o mesmo inventário de equipamentos do jogador.
- Modo Guardião: ataca inimigos próximos que estejam causando dano à nave do jogador.
- Coletor de BOX: busca cargo boxes, vende automaticamente recursos vendáveis e preserva Xenomit.
- Coletor de Pedras: coleta minérios soltos automaticamente dentro do alcance.
- O alcance do P.E.T. cresce a cada nível.
- P.E.T. usa a munição laser atualmente selecionada quando está em Modo Guardião.
- Atalho P abre o painel do P.E.T.
