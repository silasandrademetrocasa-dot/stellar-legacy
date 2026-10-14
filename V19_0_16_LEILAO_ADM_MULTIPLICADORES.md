# Stellar Legacy V19.0.16 — Leilão dinâmico configurável no ADM

## O que mudou
- Painel ADM → **PREÇOS → LEILÃO** permite editar taxa **1 STL em CR**, piso fixo Nova, piso geral, multiplicadores por categoria e multiplicadores opcionais individuais por lote. Prévia instantânea do preço inicial em CR.
- Os preços reais em STL vêm de `public.live_shop_prices_v16`; após alteração de preço da Loja, o leilão também usa o novo preço.
- Fórmula: `teto(preço em STL × conversão × multiplicador / 100.000) × 100.000`, respeitando piso geral. Nova ignora conversão e abre pelo piso exclusivo, inicialmente 100M.
- Valores iniciais: 1 STL = **6.667 CR**; munição **2,5x**; mísseis **2x**; naves **0,03x**; lasers/geradores/extras **0,04x**; drones/módulos AUX-9 **0,05x**. Múltiplos diferentes são necessários para preservar acesso aos lotes caros de equipamentos permanentes.
- Exemplo: PLS-3 (3.000 STL) = 50,1M CR; PLS-4 (12.000 STL) = 200,1M CR; CMT-3 (400 STL) = 5,4M CR; CMT-4 (1.000 STL) = 13,4M CR.
- Cálculo mínimo definitivo acontece no Supabase por `auction_minimum_floor_v1916`, com o catálogo autorizado como fonte. `place_auction_bid_online` não confia mais no piso enviado pelo cliente, e rejeita refs ou itens incompatíveis.
- As novas regras afetam apenas novos lances. Lances já gravados não são excluídos. O lance do sistema continua crescendo durante a hora.
- Editor ADM faz verificação de versão para evitar alterações simultâneas.

## Instalação
1. O SQL `sql/STELLAR_V19_0_16_AUCTION_PRICING.sql` foi **aplicado e validado no Supabase de produção**. Não rode novamente.
2. Suba **o ZIP completo V19.0.16** no GitHub com o instalador principal habitual.
3. Quando Render atualizar, vá em ADM → PREÇOS → LEILÃO. Modifique os valores e salve.
4. Até o Render atualizar, clientes de versões anteriores podem receber recusa de lance por causa dos novos pisos; isso é esperado.

## Segurança
As configurações requerem conta ADM verificada pela função `is_game_admin_v1763(auth.uid())`. O banco confere conversão, pisos, todos os multiplicadores, atualização concorrente, elegibilidade real do item e saldo de créditos. Nenhum save, inventário, custo de loja ou lance existente foi modificado pelo SQL.
