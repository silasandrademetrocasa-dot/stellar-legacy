# Checklist de migração de comandos — V119 (estado real)

**Atenção:** este checklist indica trabalho por completar. `game_saves` já é o único JSON de jogo, mas ainda há múltiplas funções autorizadas a alterá-lo. O trigger V119 apenas observa e protege checkpoints dessas mutações, não unifica sozinho as regras de cada uma.

| Módulo | Origem atual | Alvo para a versão final | Situação com esta entrega |
| --- | --- | --- | --- |
| Sincronização geral | PUT `/api/save`, `stellar_commit_player_save_v118` | Comando `checkpoint` com revisão CAS e fila única | Gateway opcional preparado (observe) |
| Hangar/CONF1/CONF2/AUX | `equipmentSavePendingV109`, intenção V106.2, save completo | `equip_gear`, `set_config`, `switch_ship` atômicos, validando posse e slots no servidor | Guardas antigos mantidos, comando ainda não migrado |
| NPC e minérios | `stellar_grant_npc_reward_v1131`/`v228`, `stellar_grant_ore_reward_v229` | `reward_npc`, `collect_ore` com chave por evento e saldo no mesmo commit | Observável pelo trigger, ainda RPC legado |
| Farm Offline | `stellar_offline_farm_claim_v484/v487/v49` | `claim_offline_farm` com snapshot de economia, encerramento e recibo único, sem erro pela virada do dia | Sessões/guardas atuais preservados, ainda RPC legado |
| Compra de munições e loja | `/api/live/purchase`, `/api/live/purchase/bulk` | `buy_catalog` via tabela de preço oficial e recibo idempotente | Operação V118 mantida; falta migrar gateway |
| Venda de recursos/drone | `/api/economy/action` e CPU remota | `sell_resource`, `sell_drone` com recibo, devolução de slots e estoque oficial | Proteção V118 mantida; falta comando tipado |
| Leilão Nova e demais itens | `/api/auction/settle`, `stellar_settle_auction_bid_v1182` | `settle_auction` com lock, débito, prêmio e status juntos | Leilão V118.2 já atômico, falta integrar recibos ao fluxo V119 |
| Leilão de protocolo AUX | `claim_aux_protocol_auction_v111` | Mesmo fluxo de liquidação do leilão | RPC legado separado |
| Missões, Passe e recompensas | `missionSaveGuardV108`, funções de claim e `flushCloudSave` | `mission_progress`, `mission_claim`, `pass_claim` idempotentes, nunca prêmios locais não validados | Guardas antigas mantidas |
| Clãs e créditos | `claim_clan_credit_grants_v12`, `process_all_clan_collection_v12` | `clan_claim`, `clan_collect` | RPCs legadas separadas |
| Arena e PvP | `claim_arena_daily_reward` e funções competitivas | `pvp_result`, `arena_claim` com recibo único | RPCs legadas separadas |
| Cupom e benefícios | `redeem_game_coupon_v1821/v193`, `redeem_aux_sentinel_coupon_v1` | `redeem_coupon` com unicidade transacional | RPCs legadas separadas |
| Relés, Universo, eventos | handlers de estágio, revezamento, `stellar_u42_action` | Comandos por evento validados no mesmo head de revisão | RPCs legadas separadas |
| Designers | Propriedade e equipagem em tabelas auxiliares | Projeções somente leitura + posse validada no estado canônico | Necessita revisão de permissões |
| Posição/presença/WebSocket | `player_location`, `player_presence` e sessão da sala | dados efêmeros, sem gravar JSON completo por frame | Separação correta; manter |

**Critérios para marcar COMPLETO:** nenhuma mutação econômica pode ser confirmada fora do gateway; uma única resposta confirma estado, revisão e recibo; A/B/C passa em 8h atravessando meia-noite; replay de cada comando concede exatamente 1 recompensa; 2 contas em PvP não compartilham estados; logs registram causa e `operation_id` sem expor IDs técnicos ao jogador.
