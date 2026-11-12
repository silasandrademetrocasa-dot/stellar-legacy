# Mapa e decisões de rotas

A auditoria estática percorreu os 1.539 arquivos da base antes da edição e encontrou 1.612 ocorrências de HTTP, RPC, tabelas, timers, sockets e declarações SQL. Isso é contagem de ocorrências textuais, **não de 1.612 requisições executadas nem de 1.612 endpoints únicos**. Existem fixtures e testes nessa contagem. A lista foi produzida antes de instalar node_modules.

Arquivos de evidência:

- `ROUTES_BEFORE.json`: hashes da base e ocorrências, com classificação inicial mecânica de candidatos.
- `MAPA_ROTAS.csv`: origem, linha da base, destino, frequência estaticamente observável, classificação proposta e situação da implementação.
- `ENDPOINTS_RENDER.json`: 187 locais de definição/montagem literal de rotas, incluindo `use` e routers. Prefixos de routers podem acrescentar caminhos.
- `DEPENDENCIAS.json`: 357 dependências importadas em JS cliente/servidor na versão atual.

Os alvos construídos por concatenação, SQL invocado internamente por funções e frequência dependente de jogo não podem ser integralmente resolvidos por busca textual. Os fixtures SQL ajudam a inspecionar dependências, mas não comprovam a configuração do banco de produção. Frequências reais de combate/menus exigem captura em execução. O CSV registra essa limitação em vez de inventar chamadas por segundo.

| Grupo | Rota/fluxo | Decisão realmente aplicada |
|---|---|---|
| REMOVER | PUT periódico fabricado a cada 7s | Removido o envio direto; substituído por detector local de alterações e notificação do único escritor |
| LOCALIZAR | Seleção de munição/atalhos e callback de CONF | Sem `await` de rede no callback do HUD; validação de posse e restrições do jogo mantidas |
| LOCALIZAR | `/api/runtime/{topbar,npcs,world,systems,pass,shops,bonus,gates,balance}` | Cache de configuração por sessão por 5min; `refresh=1` disponível |
| SINCRONIZAR | GET/PUT `/api/player/save` | Mesmo endpoint; negociação de delta, reconstrução e fallback integral idempotente |
| SINCRONIZAR — pendente | `/api/player/purchase`, `/purchase/bulk`, `/economy` | Mantidos; ID de compra mais durável; ainda não migrados para execução otimista/batch |
| SINCRONIZAR — pendente | `/api/player/collections/ensure` e `/claim`, WebSocket de coleta | Mantidos; ainda exigem confirmação da coleta; não são coletados em lote pelo V145 |
| SINCRONIZAR — pendente | Missões, prêmios, craft, protocolos, farm | Mantidos; preservar recibos/relógio do servidor; integração econômica assíncrona ainda pendente |
| MANTER | Auth login/refresh/session-status/logout | Mantidos integralmente; sem enfraquecimento da sessão única |
| MANTER | Leilões, clãs, transferências, premium, PvP, eventos competitivos | Autoridade compartilhada preservada |
| MANTER | Presença, combate, NPCs e WebSocket | Não foram convertidos para simulação offline autoritativa local |
| MANTER | RPC/PostgREST diretos existentes | Inventariados, não apagados nesta cumulativa |
| MANTER | Rotas antigas que já devolviam 410 | Tombstones preservados; não são um segundo caminho de escrita |

**Nenhum endpoint, tabela, função SQL ou subscription foi excluído nesta versão.** O objetivo é não romper consumidores ainda ativos. “REMOVER” no inventário inicial significa candidato a investigar; a tabela acima é o registro efetivo das mudanças.

As consultas necessárias por operação econômica ainda podem ser múltiplas. Este pacote não apresenta a redução de payload cliente/Render como redução equivalente de SQL ou custo Render/Supabase.
