# Rotas e dependências V146

Este é o delta do mapa completo entregue em `docs/local-first-v145/ROTAS.md`. Não se excluíram endpoints com consumidores antigos.

| Origem | Destino | Frequência/necessidade | Classificação e resultado |
|---|---|---|---|
| Compra normal de catálogo | Antes POST `/api/player/purchase`; agora append IndexedDB + POST `/api/player/economy/batch` | Por evento local; lote até 40 a cada janela com alterações | LOCALIZAR resposta visual; SINCRONIZAR débito/concessão; rota individual MANTER para fallback/clientes antigos |
| Compra bulk de munição/míssil | Antes POST `/api/player/purchase/bulk`; agora mesma fila/batch | Uma intenção por lote comercial, agrupável com outras | LOCALIZAR prévia; SINCRONIZAR; preservar cotação exata e recibo |
| CPU AUTO BUY/Autopilot | Antes POST `/api/player/economy`; agora evento `economy/auto_buy` | Ao faltar suprimento; envio antecipado assíncrono | LOCALIZAR estoque provisório; SINCRONIZAR; MANTER validação CPU/base/preço/saldo |
| Porão/inventário com estoque local conciliado | Mesmo batch, ações `sell_cargo`/`sell_inventory` | Apenas quando há venda | LOCALIZAR remoção/crédito provisório; SINCRONIZAR; estoque/valor final pelo servidor |
| Venda com mineração/montagem pendente; venda de drone | Caminho autoritativo/preflight anterior | Dependência de estoque/layout oficial | MANTER até migração completa; não anunciar como totalmente offline |
| Coleta | Append local; WS `observe_drop_v146`; POST batch | Uma prova WS leve por drop + lote econômico | LOCALIZAR desaparecimento; SINCRONIZAR crédito; MANTER prova/validação de drop e recibo |
| Consulta de BOX/respawn | `/api/player/collections/ensure`, rotas WS existentes | Snapshot de drops e reposição do cenário | MANTER; filtrar IDs pendentes para não reaparecerem durante sync |
| Login/read oficial | GET `/api/player/save`, cabeçalho `X-Stellar-LocalFirst: 146` | Bootstrap/recuperação explícita, não por clique | MANTER; RPC novo negocia protocolo, fallback em função ausente |
| Checkpoint de progresso/CONF/hangar | GET/PUT `/api/player/save` e delta V145 | Alterações locais agrupadas, sem polling novo de saldo | SINCRONIZAR; bloquear somente transporte de projeções financeiras ainda pendentes |
| Handler econômico Render | `stellar_shop_context_v1451`, núcleo de commit via wrapper V146 | Validação por evento no servidor | MANTER autoridade; não confundir lote HTTP com um único comando SQL |
| Batch → recibos | SELECT dos IDs do lote; `stellar_localfirst_commit_v146`; finish para recusa/replay especial | Um SELECT de recibos por batch; commits apenas dos eventos novos | SINCRONIZAR; REMOVER segundo ACK SQL quando o commit já trouxe cursor atômico |
| Leilão, premium, transferência, PvP, Arena | Rotas e RPC atuais | Disputas e recursos compartilhados | MANTER confirmação autoritativa |
| Missão/recompensa, passe, craft, protocolos, portais, World Boss e farm offline | Rotas e RPC atuais | Dependências próprias ainda existentes | MANTER; consumidores ainda não foram todos migrados para a fila |

REMOVER nesta etapa significa retirar a espera/remessa individual dos caminhos migrados e evitar o segundo ACK SQL redundante. **Nenhum endpoint de produção foi apagado.** `stellar_player_commit` e os validadores de negócio anteriores continuam sendo o destino final seguro dos commits. As funções novas são acessíveis somente pela service role; o APK não as chama diretamente.
