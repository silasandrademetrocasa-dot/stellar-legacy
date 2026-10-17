# Stellar Legacy — instalação da blindagem dos abates de NPC

## Estado do Supabase (confirmado neste desenvolvimento)
- Migração V22.7.0 etapa B (`stellar_v22_7_0b_live_server_save_gate`): **aplicada**. O navegador não pode escrever diretamente em `game_saves`.
- Migração V22.8.0 (`stellar_v22_8_0_npc_reward_server_ledger`): **aplicada**. CR/STL de NPCs passam por transação única registrada em `stellar_npc_reward_ledger`.
- Teste transacional do resgate único executado com rollback (sem alterar jogador real).
- Nenhum SQL precisa ser executado pelo usuário para estas duas migrações.

## Publicar a nova versão
1. Envie apenas o ZIP `stellar-legacy-V22.8.0-NPC-REWARDS-AUTORITATIVOS.zip` para a raiz do repositório GitHub.
2. Acesse **Actions → Instalar versão do Stellar Legacy → Run workflow**.
3. Verifique no Render o deploy `22.8.0` concluído e o servidor saudável.
4. Entre com conta de teste, confira CONF 1/2 e faça um abate em X-1. Verifique CR/STL e XP, depois atualize a página e confira persistência.
5. Confira abates consecutivos e em grupo (divisão proporcional da recompensa) e eventos/chefes que usem o NPC compartilhado.
6. Faça uma compra pequena de CR na loja, salve e atualize a página. Confirme que os novos gatilhos não quebraram a compra.
7. Consulte `stellar_npc_reward_ledger` no Supabase: um evento de abate por usuário deve existir só uma vez por chave.

## Como funciona a proteção
- O servidor escolhe qual NPC realmente morreu, quem é elegível e a parcela de CR/STL.
- O SQL aplica bônus de habilidade Ganância/Crueldade do save existente, concede CR/STL e cria comprovante idempotente por `(user_id, kill_key)` numa só transação.
- O navegador recebe valores **depois** da confirmação no banco; não envia valores ou preços ao SQL.
- `serverNpcRewardRevision` impede que um save atrasado apague as recompensas; o cliente sincroniza após `SAVE_NPC_STALE`.
- Jogadores não têm acesso de execução à função de concessão nem de escrita à tabela de comprovantes.
- A sala limita disparos sem identificador, duplicados e acima de 2 milhões de dano por golpe para jogadores (5 milhões para ADM).

## Limites do que ainda NÃO está migrado
**Não liberar pagamentos com dinheiro real ainda.** XP, caixas, drops especiais, missões legadas, recompensas de nível e outras atividades ainda podem ser calculadas no cliente. Parte do cálculo de dano ainda vem do cliente, mesmo limitada pelo servidor. Os comprovantes NPC protegem **CR/STL originados de abates online**, não constituem um ledger econômico global. A próxima etapa deverá converter cada fonte de renda em transações autenticadas, com testes específicos para bônus e reembolso.

## Recuperação
Se a recompensa não puder ser confirmada pelo Supabase, o servidor mostra erro e o navegador **não acrescenta CR/STL**. Consulte os logs `[npc-reward]` do Render, sem publicar chaves ou tokens. Não desabilite trigger/ledger para contornar falhas.
