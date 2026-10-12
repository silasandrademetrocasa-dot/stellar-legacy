# V18.2.11 — NOVA ELITE, LEILÃO 2× HALO

- No jogo atual, HALO é item comum em CR na Loja e **não aparece como lote Elite**. Para a relação 2× foi usada sua base de compra na Loja (atualmente 10.000.000 CR), não um lance inexistente de HALO.
- O NOVA continua com seu preço de Loja de 15.000 STL. Isso **não muda** o preço ou os créditos do jogador.
- Novo preço de abertura (sem outros lances): **20.000.000 CR**. Durante a hora, o sistema aumenta o preço conforme o leilão existente. Se alguém já estava liderando antes desta atualização, o lance registrado é preservado; os novos lances devem atingir o novo piso.
- O jogo obtém o preço-base do HALO pelo `liveCatalog('drone:flax')` (Supabase `live_shop_prices_v16`), com fallback local. A função `auctionNovaStartFloor` normaliza a 100.000 CR.
- Lotes persistidos pela versão anterior são atualizados visualmente sem excluir lances válidos nem reiniciar outros leilões.
- Banco Supabase `place_auction_bid_online` já recebeu o mínimo autoritativo de 2× o preço-base do HALO e uma correção da ambiguidade entre as variáveis `RETURNS TABLE` e colunas SQL.
- Testes: sintaxe dos JS, cenários inicial/legado com preço antigo, lance mínimo, proteção SQL, ZIP intacto.
- **Atenção:** o SQL de proteção já foi aplicado ao Supabase do projeto; esta versão precisa ser publicada no GitHub/Render para atualizar o **preço mostrado** na UI do leilão. Não é necessário executar SQL novamente.
