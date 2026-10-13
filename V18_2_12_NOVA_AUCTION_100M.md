# NOVA Elite — Leilão com abertura fixa em 100M CR

- NOVA: piso fixo inicial de 100.000.000 CR, para todos os jogadores.
- Quantidade de NOVAs possuídos não altera preço de abertura.
- HALO e Loja comuns sem mudança.
- O leilão segue com preço automático que cresce dentro de cada ciclo de uma hora; lances de jogadores precisam superar os existentes em 100.000 CR e obedecer piso mínimo de 100M.
- Proteção do piso do NOVA implementada na função Supabase `public.place_auction_bid_online`, não confiando no `systemFloor` enviado pelo cliente.
- O ZIP V18.2.12 atualiza interface e cache de assets. Nada de SQL adicional após o banco ser atualizado.
