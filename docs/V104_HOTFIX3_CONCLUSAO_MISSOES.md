# Stellar Legacy V104 — HOTFIX 3: confirmação de conclusão de missões

**Base obrigatória:** HOTFIX 2 (missões + política de polling PvP) aplicado em V104/47.7.60.

## Sintoma real relatado em 29/10/2026

O jogo anuncia conclusão, mas a missão ainda mostra faltando 1 NPC e não permite aceitar a próxima da mesma categoria. No intervalo anterior ao hotfix, o Supabase registrou `SAVE_NPC_STALE`; o HOTFIX 2 preservava só a missão ativa *não concluída*. No cliente, `finishMissionAutomatically` aplicava prêmios/limpava a missão antes de a conclusão ser aceita pelo servidor.

## Mitigação HOTFIX 3 — conclusão em duas etapas

1. Ao atingir a meta, `missionEvent` registra **objetivo completo, aguardando confirmação**, sem pagar prematuramente, e agenda o save.
2. Somente após o ACK do PUT `/api/save` que contém a missão concluída, o cliente libera o prêmio e a categoria; o prêmio é persistido em um segundo save.
3. Se o save da etapa 1 for rejeitado com `SAVE_NPC_STALE` ou `SAVE_ORE_STALE`, a rotina de merge preserva a missão 100% concluída **desde que ainda não esteja paga** (`awaitingCloudAckV107`). A missão não volta para 9/10.
4. Se houver conflito na segunda gravação, o save remoto contém a missão 100% confirmada, ainda sem prêmio; o cliente recupera essa etapa e tenta completar após novo ACK. Conclusões cujo registro já existe no servidor nunca são reconstruídas.
5. O contador e o aviso inicial distinguem `Objetivo completo • confirmando recompensa` de `Recompensa automática` depois do ACK.

## Segurança e limitações

- **Nenhuma mudança SQL ou edit de dados**, nenhuma desativação dos triggers de segurança. O ledger NPC e as revisões econômicas do servidor continuam autoritativos.
- O cliente continua fazendo dois PUTs (objetivo e prêmio). Para garantia transacional absoluta, o caminho ideal futuro é uma RPC de concessão única, idempotente, no PostgreSQL, com validação da missão e suas recompensas.
- Uma RPC de missão 100% server-side **não faz parte** deste patch. Esta correção ataca o estado que regride e o prêmio antes da sincronização, sem alterar balanceamento.
- Recompensas de abates compartilhados só atualizam objetivos quando o jogador tem a marcação de dono; uma recompensa econômica dividida não constitui abate válido para a missão.
- Validação local automatizada não substitui Android + servidor em produção. Não publicar durante farm sem querer interromper o comparativo.

## Arquivos no pacote incremental

- `public/game.js` — etapa de confirmação, tratamento de `SAVE_*_STALE` e finalização após ACK.
- `public/index.html` — atualização do cache-buster do JS.
- `public/modules/mission-save-recovery-v105.js` — resgate também de missão concluída *ainda sem prêmio*.
- `public/modules/mission-completion-sync-v107.js` — regras puras que verificam qual missão pode ser finalizada após ACK.
- `tests/v106-pvp-inbox-policy.test.mjs` — atualiza cache-buster esperado; não altera comportamento PvP.
- `tests/v107-mission-completion-sync.test.mjs` — novos casos de teste.
- `docs/V104_HOTFIX3_CONCLUSAO_MISSOES.md` — estas notas.

## Teste manual após instalar o APK

1. Aceite uma missão de 8 ou 10 NPCs, acompanhe o HUD até o penúltimo abate.
2. Mate o último NPC marcado por você, verifique `Objetivo completo • confirmando recompensa` e observe a transição para `Recompensa automática` após sincronizar.
3. Abra missões: a categoria deve estar livre; aceite a próxima **uma única vez**.
4. Relogue e valide a missão no banco, sem saldo duplicado.
5. Compare `SAVE_NPC_STALE`, `SAVE_ORE_STALE`, erros HTTP 400 de `game_saves` e telemetria por 30–60 min. Ainda pode haver conflito de save econômico; o objetivo é impedir a regressão do estado de missão.
