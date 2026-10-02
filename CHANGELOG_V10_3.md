# V10.3 — Premium Online

## Central de Configurações
- A aba CONF agora possui três áreas: JOGO, RANKING e CONTA.
- Ranking fica visível somente dentro de Configurações.
- Conta permite alterar nome do piloto, alterar senha e sair da sessão.
- Mostra e-mail, nível, XP, aliens destruídos e Galaxy Gates concluídos.

## Ranking Online
- Ranking por Nível.
- Ranking por XP.
- Ranking por Aliens Matados.
- Ranking por Galaxy Gates concluídos.
- Dados são sincronizados no Supabase através da tabela `profiles`.

## Leilão Persistente
- Lances são registrados online na tabela `auction_bids`.
- Atualizar/reabrir o jogo restaura lances ativos.
- A garantia passou a ser reserva virtual: os Créditos não desaparecem ao atualizar a página.
- Créditos reservados ficam indisponíveis para novos lances; o valor só é debitado ao vencer o lote.
- Perdeu o lote: a reserva simplesmente é liberada.
- Lances antigos são liquidados ao retornar ao jogo.
- Todos os novos itens Elite elegíveis entram automaticamente no catálogo.
- Naves únicas já possuídas, EXTRAS únicos já possuídos e equipamentos únicos do P.E.T. já possuídos deixam de aparecer.

## Banco de Dados
- `profiles.aliens_killed`
- `profiles.gg_completed`
- tabela `auction_bids`
- função autenticada `get_public_rankings()`
