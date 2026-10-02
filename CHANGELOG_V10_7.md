# V10.7 — Route Network

## Estrutura oficial de rotas
O mapa de rotas e os portais físicos agora usam a mesma topologia.

### Terra
- 1-1 ↔ 1-2
- 1-2 ↔ 1-3
- 1-2 ↔ 1-4
- 1-3 ↔ 1-4
- 1-3 ↔ 2-4
- 1-4 ↔ 3-4
- 1-4 ↔ 4-1

### Marte
- 2-1 ↔ 2-2
- 2-2 ↔ 2-3
- 2-3 ↔ 2-4
- 2-3 ↔ 3-3
- 2-4 ↔ 4-2

### Júpiter
- 3-1 ↔ 3-2
- 3-2 ↔ 3-3
- 3-3 ↔ 3-4
- 3-3 ↔ 4-3

### Battle Maps
- 4-1 ↔ 4-2
- 4-1 ↔ 4-3
- 4-2 ↔ 4-3

## Correções solicitadas
- 3-2 NÃO conecta ao 4-3.
- Somente 3-3 conecta ao 4-3.
- 3-3 conecta ao 2-3 e a rota é bidirecional.
- Removidas conexões antigas incorretas 2-3↔4-1, 2-4↔3-3, 3-2↔3-4 e 3-4↔4-3.

## Posicionamento físico
- Portais são gerados dinamicamente perto dos limites do mapa.
- A posição de cada portal aponta visualmente para a direção do mapa conectado no grafo.
- Ao atravessar um portal, a nave surge no portal correspondente do mapa de destino.
- Terra, Marte e Júpiter deixam de compartilhar a mesma disposição física de portais.

## Bases
- Terra 1-1: base no lado esquerdo.
- Marte 2-1: base no lado direito/superior.
- Júpiter 3-1: base no lado direito/inferior.
- Zona Segura, Trader, minimapa, spawn e proteção de NPC usam a posição real da base da companhia.
