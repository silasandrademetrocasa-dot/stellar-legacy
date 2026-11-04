# Stellar Legacy — Save Único / Validação Única / Logs por módulo

**Estado da entrega:** núcleo do banco e conexão com o Render preparados, **não é migração total das operações antigas**. Implantar progressivamente e homologar no banco de testes antes de produção. Não substituir os saves ativos nem zerar contas.

## Fonte de verdade

`public.game_saves(user_id,state,updated_at)` guarda o **único estado jogável**: moedas, itens, nave, drones, AUX, CONF1/2, missões, Passe, posições persistidas e progresso. `profiles` é projeção para consultas. Presença, posição em tempo real e grupos são efêmeros e não se sobrepõem ao estado canônico.

`stellar_player_save_head_v119` é *somente metadado* (`revision`, hash), `stellar_player_save_operation_v119` é recibo de comando, `stellar_player_save_journal_v119` é histórico resumido, `stellar_player_save_checkpoint_v119` guarda as cópias A/B/C **apenas de estados confirmados**. As tabelas de módulos devem ser leitura/histórico, **não inventários paralelos**.

## Uma operação, uma transação

**Alvo obrigatório após a migração:** `Render` autentica/sessão/limite → valida comando tipado (`equipar`, `comprar`, `vender`, `claim_mission`, `claim_farm`, `settle_auction`, `npc_reward`, `capture_relay`) → toma lock por jogador → checa `operation_id` e `expected_revision` → lê estado canônico → aplica regra do módulo no servidor → grava **uma** linha `game_saves` + projeção `profiles` + recibo de idempotência + log + checkpoint A/B/C na mesma transação → retorna novo estado e revisão. Em erro, tudo volta, inclusive status e cobrança.

### Fases (não pular)

1. **Núcleo seguro:** executar PREPARAR, checar seis contas, ativar auditoria universal e observar no Render. Em falha de carga, executar DESATIVAR. Não colocar `STELLAR_SAVE_V119_MODE=enforce` ainda.
2. **Autoridade de comandos:** `stellar_commit_player_command_v119` recebe operações do Render e confirma snapshots atomizados via o validador existente V118. Testar com conta de homologação parada, depois com uma conta. O RPC não pode ser chamado por `authenticated`.
3. **Migração das mutações reais:** converter compras, vendas, leilões, missões/Passe, Hangar/CONF, Farm Offline e recompensa de NPC/minério para *comandos específicos* que validam preço/posse/revisão e usam o mesmo commit. O cliente passa a enviar intenção, **nunca valores finais de créditos, STL ou itens**. Não marcar V119 completo antes dessa etapa.
4. **Corte de gravações antigas:** impedir `game_saves` escritos fora do comando central; RPCs legadas deixam de escrever estado e viram consultas ou auditores. Desativar filas paralelas que reescrevem a montagem ao sincronizar. Só então ativar o modo `enforce` para todos.
5. **Homologação longa:** duas contas, combate de 8h atravessando meia-noite, compras/vendas, leilão, missões, PvP/relés, reinício e reconexão. Exigir 0 recompensas duplicadas, 0 perdas de itens e 0 saves não confirmados silenciosamente.

## Auditoria do legado (risco atual)

Foram identificadas mais de 20 rotinas RPC que escrevem `game_saves` diretamente. Exemplos: recompensa de NPC, minério, coleta do Farm, clã, Arena, leilão e cupons. O RPC V118 grava `game_saves` + `profiles` + backups na mesma transação, mas não coordena esses RPCs independentes.

O trigger da Etapa 1 oferece **um único número de revisão por mudança confirmada** e captura mudanças independentemente da origem. Ele NÃO substitui a validação de negócio de cada módulo nem conserta automaticamente uma operação anterior. É uma etapa de segurança, necessária para migrar sem perder o progresso.

## Checkpoints

- **A:** último estado confirmado no banco, não o `localStorage` do celular.
- **B:** versão anterior amostrada após um intervalo ou mudança de Hangar/missões/leilão.
- **C:** geração anterior à B.

Nunca restaurar A/B/C diretamente sem reconciliar revisões NPC, comércio, recompensas e receipts já emitidos.

## Deploy / rollback

- Backup imutável de `game_saves` e `profiles` antes de cada etapa (o backup V118 existente não substitui um novo backup antes do deploy).
- SQL PREPARAR e ATIVAR são distintos. Sem ATIVAR não há incremento automático de revisões; modo `enforce` permanece desligado.
- Se o Render lançar erros de trigger, roda DESATIVAR (não DROP das tabelas com histórico). Reverter apenas o código opcional de gateway.
- Monitorar transações por minuto e tempo P95/P99 do Supabase após a ativação: o trigger adiciona gravações a cada atualização de NPC; se o custo ficar alto, ajustar intervalo/volume antes de produção.
