# AUDIT V17.0.0 — VISUAL REVAMP

## Entregas
- Pack V17 de naves em `/public/assets/v17/ships`.
- Pack V17 de naves para mapa em `/public/assets/v17/ships-map`.
- Pack V17 de drones/AUX-9 em `/public/assets/v17/drones`.
- Pack V17 de drones/AUX-9 para mapa em `/public/assets/v17/drones-map`.
- Manifesto V17 com pipeline dual: UI x mapa.

## Ajustes técnicos
- `game.js` agora usa `shipMapAsset()` e `droneMapAsset()` nas renderizações do mapa.
- UI / loja / hangar continuam usando `ships` e `drones` (card sprites).

## Observação
- O objetivo desta revisão foi evitar sprites cortados e reutilização da mesma perspectiva entre loja e mapa.
