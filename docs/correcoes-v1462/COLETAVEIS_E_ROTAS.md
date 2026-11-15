# Check-up de coletáveis e rotas

Inventário estático dos 25 exports de claim/redeem/collect de `public/api.js`: `INVENTARIO_APIS_COLETAVEIS.json`. O farm tem transporte próprio em `stellar-offline-farm-v484.js` e foi considerado separadamente. O inventário não é medição de tráfego nem prova de execução de cada sistema em produção.

| Coletável | Destino/autoridade | Resultado da revisão |
|---|---|---|
| Níveis | `/api/player/rewards/claim` → `stellar_player_commit`, chave de recompensa | Corrigido: comando direto; checkpoint somente quando elegibilidade ainda não chegou; botões e resgate sequencial |
| Passe Free/Premium | Mesmo endpoint; temporada e trilha na chave, Premium verificado no servidor | Corrigido: mesmo fluxo, preservação de objetivos locais e marcações oficiais |
| Diárias do passe | Progresso local → checkpoint validado; pontos ao concluir | Preservação corrigida ao receber economia; não foi criado outro botão de prêmio diário |
| Natal: missões, cupom, metas de facção/globais | `/api/player/natal/claim` → `stellar_player_natal_action`; chave única por jogador | Corrigido preflight indevido e corrida de status; só confirmar após recibo+estado |
| Natal: designs do passe/loja | Mesmo endpoint; inventário de designs e regras do SQL | Passe envia checkpoint necessário; designer de loja mantém preflight de saldo; catálogo/preço/temporada preservados |
| Missões normais | `/api/player/missions/claim` → comando V133.1 | Preservados recibos e concessão; nova tentativa de missão concluída deixa de esperar `cloudDirty=false` global |
| World Boss | RPC `stellar_player_claim_world_boss_v135` | Removida espera global; estado completo instalado pelo caminho central |
| Arena diária | RPC `stellar_player_claim_arena_daily_reward` | Removida espera global; guardas de tela/servidor mantidas; resposta já resgatada pode não trazer estado |
| Suprimento/campanha de guerra | `/api/war/supply/claim`, `/api/war/campaigns/:id/claim` | Removida espera global; eliminada cópia parcial de saldos |
| Temporada competitiva | `/api/command/season/:id/claim` | Mesmo tratamento e estado completo, sem substituir apenas moedas |
| Operações Elite | `/api/elite/claim` | Mesmo tratamento; elegibilidade/limites continuam no servidor |
| Cupons gerais | `/api/player/coupons/redeem` | Removida exigência de save totalmente ocioso; deduplicação/replay e instalação central |
| Contratos pessoais da Fronteira | `/api/frontier/claim` → `stellar_player_frontier_claim` | Adaptador específico: o RPC antigo não traz estado. Faz leitura canônica após recibo e recupera ALREADY_CLAIMED após resposta perdida. Não aplica moeda parcial |
| Créditos recebidos do clã | RPC `stellar_player_claim_clan_credit_grants` | Ao receber créditos, instala estado completo ou o lê, em vez de copiar `new_credits` sobre projeções pendentes |
| Operações de clã, missões de relé, domínio/prêmios de guerra, contrato coletivo | Rotas de clã/relé/domínio/Fronteira; cofres/peças compartilhados | Autoridade coletiva e atualização de painel preservadas; não viraram crédito local pessoal |
| Pesquisa: esquadrão, operações, exploração e raid | RPCs `stellar_u42_squad_claim_v421`, `stellar_u423_operation_claim`, `stellar_u426_sector_claim`, `stellar_u435_raid_claim` | Contas/tabelas próprias de pesquisa, não cópias do saldo do save; preservados. Falta validação ponta a ponta no APK |
| Bônus Astral | `/api/astral-rewards/claim` → cursor de conclusões V381 | Espera apenas checkpoint necessário pelo escritor atual. Continua uma chamada por clique e leitura posterior do save. Não se aplicou retry automático que pudesse consumir outra conclusão |
| Designer de portal/evento | RPCs `claim_gate_drone_design_v163`, `claim_event_designer_v165` | Posse/recibos preservados; ainda têm checkpoint/refresh próprios. Não migrados ao novo executor |
| Leilão AUX | RPC `stellar_player_claim_aux_protocol_auction` | Transação disputada e confirmação autoritativa preservadas |
| BOX/loot | Batch/prova V146 e contato V146.1 | Preservado; testes de 500 coletas/replays continuam passando |
| Farm offline | `/api/offline-farm/v484/*`, sessão e liquidação no servidor | Preservado relógio/consumo/antirrepetição; não entra em retry cego de tarefa nem concede pelo relógio do aparelho |
| Jornada inicial e recompensa do evento galáctico no fallback local | `grantJourneyReward` e caminho local de `rewarded` em `game.js` | Pendência arquitetural preexistente: ainda contêm concessões locais. Não foram anunciados como migrados/seguros pelo novo executor; exigem comando autoritativo específico e testes de migração |

## Removido, substituído, preservado

- REMOVER: espera global de saldo/save em resgates já autoritativos; cópia parcial de carteiras em guerra/temporada/Elite; dependência do GET seguinte para marcar Natal.
- SUBSTITUIR: critérios de liberação do resgate pelo ACK da revisão necessária e pelo recibo da própria tarefa; quatro âncoras repetidas por oito explícitas.
- PRESERVAR: todos os endpoints/RPCs/tabelas, autenticação, locks, recibos, A/B/C, batch de compras/coletas, validação de nível/Premium/temporada/estoque, transações compartilhadas e visual original.

Nenhuma rota foi apagada. Não se alterou produção. Em leitura de configuração, a temporada novembro estava ativa, com 450 pontos/tier; Natal habilitado entre 07/11/2026 03:00Z e 06/01/2027 03:00Z. Isso descarta configuração desativada naquela consulta, mas não substitui logs de uma falha específica. Logs do Render não foram consultados: o conector não tinha workspace selecionado.
