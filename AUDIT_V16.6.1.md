# AUDIT V16.6.1

## Objetivo
Polimento do HUD inferior e preparação do catálogo de eventos sem ativar novos eventos automaticamente.

## Entregas
- Docks inferiores reorganizados em grade fixa: CHAT | MUNIÇÕES | MAPA.
- Chat e minimapa padronizados com tamanhos equivalentes.
- Campo de mensagem do chat ancorado no rodapé.
- Minimapa passa a destacar NPCs de evento mesmo fora do radar normal.
- Novo catálogo de eventos criado em modo dormant via SQL.

## Arquivos alterados
- public/style.css
- public/game.js
- public/index.html
- server/index.js
- package.json
- CHANGELOG.md
- README.md
- sql/V16_6_EVENT_CATALOG_DORMANT.sql
- EVENT_CATALOG_V16_6.md
