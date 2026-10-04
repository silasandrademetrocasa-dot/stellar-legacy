# Stellar Legacy V16.0.0 — ETAPA 1 — LIVE OPS CORE

## Escopo desta etapa
Esta entrega é propositalmente pequena para reduzir risco e tempo de atualização.

### Eventos controlados pelo Supabase
- A rotação local de 15 minutos foi removida dos mapas online.
- O Render carrega `live_event_config_v16` por RPC e mantém cache curto.
- `enabled`, `starts_at`, `duration_minutes`, `repeat_minutes`, `priority`, `target`, `reward` e `rules` passam a ser controlados pelo banco.
- O Shared Universe distribui o mesmo evento para todos os jogadores.
- Se não houver evento ativo no banco, nenhum evento local é inventado pelo cliente.
- O botão antigo de forçar evento não altera mais a rotação local; o controle é feito no Supabase.

### Preços LIVE OPS
- O cliente carrega `live_shop_prices_v16` ao entrar e ao abrir a loja.
- Preços exibidos de Naves, Lasers, Geradores, Drones, AUX-9, módulos, munições, mísseis, Materializador, Núcleos Quânticos e Trader podem ser alterados no Supabase.
- Preços de recursos do Trader também são lidos do catálogo online.

### Compras autoritativas nesta etapa
As compras da Loja principal passam pelo Render, que relê o preço do catálogo do Supabase antes de debitar/conceder:
- Naves
- Lasers / Geradores / Extras
- Drones
- AUX-9 e módulos
- Munições
- Mísseis

O desconto PREMIUM de 5% dos itens Elite é recalculado no servidor.

## Próxima etapa de segurança econômica
A V16.1/Etapa 2 continuará a migração das mutações econômicas que ainda pertencem ao gameplay legado, principalmente:
- AUTO BUY de munição/míssil
- Venda de inventário/drones
- Venda do Trader
- Compra de slots AUX-9
- Materializador / Núcleos Quânticos

Isso evita fazer uma mudança gigante de uma vez e facilita rollback/teste.

## Supabase
A base LIVE OPS já foi aplicada no projeto `stellar-legacy`, incluindo `get_live_ops_v16()`.

## Validação
- `node --check public/game.js`
- `node --check public/api.js`
- `node --check server/index.js`
- `node --check server/world.js`
