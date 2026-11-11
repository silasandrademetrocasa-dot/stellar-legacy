# Check-up de persistência — 11/11/2026

## Resultado e alcance

Os resultados observados são bons, mas não constituem garantia de ausência de falhas ou teste de carga. Esta revisão combinou leitura do banco em produção, inventário de escritores e testes locais de concorrência/reenvio. Não executou compras, vendas ou concessões em contas reais.

| Verificação | Evidência |
|---|---|
| Inventário de escritores V134 | As 43 funções presentes no inventário mantêm o marcador da trava compartilhada por jogador na definição instalada. O commit central também chama a trava e confere recibo antes de gravar. |
| Atividade observada nas últimas 24 h | 427 comandos de checkpoint, 44 de coleta e 5 de economia na consulta inicial. Não extrapolar esses números para setores sem movimentação nessa janela. |
| Créditos e identidade | Três saves atualizados nas últimas 24 h: nenhum perfil ausente, divergência de créditos no perfil, identidade de proprietário divergente ou backup A ausente. Créditos do backup A também conferem. |
| Outros campos do backup A | Nos mesmos três saves, porão, munição, inventário, loadout da nave, missões e STL conferem com o save principal. |
| Erros de permissão anteriores | 114 ocorrências: 86 em `stellar_collection_context_v138` e 28 em `stellar_player_commit`. A última foi em 11/11 às 14:40:43 de Brasília. Não houve novas ocorrências desse tipo depois desse horário na janela consultada. |
| Outros erros históricos | Um `P0001` às 01:46 e um `23514` às 01:37, horário de Brasília. A contagem isolada não prova a causa nem perda de dados. |
| Permissões atuais dos RPCs críticos | Commit, contexto de coleta, criação de boxes e concessão de NPC: execução permitida ao backend; negada a `anon` e `authenticated`. |
| Índices do caminho quente | Drops possuem índice `(user_id,map_key,kind,available_at)` e chave `(user_id,drop_id)`; recibos usam `(user_id,command_id)`; contadores natalinos têm chave única e índice `(faction,kind)`. |
| Nova coleta natalina | Mesma transação do commit de coleção; validação de sessão e Farm preservada. Contadores são executados depois da verificação de replay e revertem junto com a recompensa em caso de falha. |

Os avisos gerais de segurança retornados pelo banco permaneceram com as mesmas contagens antes/depois da migração; isso não representa aprovação global de segurança de todos os sistemas. As funções novas são `SECURITY INVOKER`, com search_path explícito e execução restrita ao backend. A verificação de saúde não trouxe avisos.

## Cenários automatizados

- Recompensa de NPC entre a leitura da base e a venda/coleta: o merge preserva o ganho posterior.
- Compra de munição, porão, missões e equipamentos mantêm as proteções de recibo, contexto e estado confirmado existentes na suíte.
- Sessão substituída, bloqueio de conta e Farm Offline rejeitam coleta sem consumir o drop.
- Perda de ACK e repetição do mesmo pedido: mesmo recibo, sem crédito/counter duplicado.
- Boxes natalinas dividem os pontos já existentes, dobram o prêmio sorteado e mantêm os núcleos probabilísticos.
- Falha do contador natalino após tentativa de save: toda a transação é revertida, incluindo dinheiro e remoção da caixa.
- Backend anterior sem identificação V142 não ativa a mistura durante a preparação do SQL.

## O que ainda falta em produção

Uma sessão prolongada com dois jogadores, executando combate + coleta + venda/compra, seguida de reconexão, troca de configuração e virada real do leilão. Conferir também craft, refinaria, protocolos, passe e cupom no uso real. Os testes locais e o inventário cobrem as proteções desses setores; não equivalem a observar todas essas operações simultaneamente no servidor publicado.

Referências técnicas consultadas: [funções do Supabase](https://supabase.com/docs/guides/database/functions), [contexto de requisição](https://supabase.com/docs/guides/api/securing-your-api) e [changelog](https://supabase.com/changelog.md). A identificação interna só controla a ativação gradual; autorização continua dependendo da função restrita ao backend.
