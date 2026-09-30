# V10.6.2 — Auction Repair & Sections

## Correção real do lance
- Identificado o erro real no PostgreSQL: `column reference "lot_ref" is ambiguous`.
- A V10.6.2 deixa de depender do RPC defeituoso para registrar o lance.
- O lance agora é salvo diretamente na linha online do próprio jogador, respeitando RLS.
- Antes de gravar, o cliente consulta o mercado real.
- Depois de gravar, consulta novamente para confirmar quem realmente ficou em primeiro.
- Em disputa simultânea, somente o vencedor fica liderando.
- Se outro jogador já cobriu, a garantia é liberada automaticamente.
- O sistema continua congelando assim que existe um lance real.

## Organização do Leilão
Lotes agora aparecem separados por sessões:
1. Naves
2. Munições & Mísseis
3. Equipamentos
4. Extras
5. P.E.T.

- Cada sessão mostra quantidade de lotes.
- Itens continuam ocultos quando são únicos e já pertencem à conta.
