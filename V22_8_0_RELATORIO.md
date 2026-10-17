# Stellar Legacy V22.8.0 — relatório técnico

## Mudanças verificadas
- Fechamento SQL etapa B da V22.7.0 após confirmação de deploy `live` no Render.
- Supabase agora restringe `game_saves` a leitura para usuários; `service_role` grava. Perfis permitem apenas nome para atualização pelo cliente.
- Ledger transacional de abates compartilhados com idempotência garantida por chave composta.
- RPC `stellar_grant_npc_reward_v228`, acessível apenas pelo serviço, calcula bônus de CR/STL com base nas habilidades persistidas no banco.
- Todos os abates elegíveis usam callback server-side e só enviam recompensa depois de persistir.
- Cliente usa exclusivamente CR/STL retornados pelo servidor; XP e progresso de missões continuam legados.
- Revisão NPC reservada e monotônica, com reconciliação do cliente.
- Combate NPC exige ID de disparo e limita excesso de dano sem autoban.

## Validação
- Testes gerais locais (ver saída `npm run verify`): 289 testes, nenhuma falha.
- Migração instalada; validação SQL: `service_role` pode executar; authenticated/anon não.
- Teste de primeira concessão e repetição na mesma transação, seguido de ROLLBACK: idempotente e zero concessões persistidas pelo teste.
- Os 6 saves e 9 relés dominados existentes continuam preservados. Nenhum comprovante de NPC artificial foi gravado.

## Ressalvas
Não foi realizado um abate real conectado à nova versão no Render (a versão atual do Render ainda é V22.7.0). Os testes locais e SQL reversível não substituem teste multiplayer com conta de teste. Nenhuma promessa de anti-hack 100%; XP, drops, outras fontes de moeda, PvP e cálculo de dano precisam continuar a migração para servidor antes do comércio real.
