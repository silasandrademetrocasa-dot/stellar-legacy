# Stellar Legacy V6.3.2

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
