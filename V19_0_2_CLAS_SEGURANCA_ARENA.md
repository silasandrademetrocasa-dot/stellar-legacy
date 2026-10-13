# Stellar Legacy V19.0.2 — Clãs e correção da Arena

## Mudanças visíveis

- Cargos: LÍDER (owner), VICE-LÍDER (deputy), MEMBRO ELITE (elite) e MEMBRO (member).
- O líder pode atribuir qualquer cargo abaixo do seu; o vice pode atribuir Elite ou Membro a integrantes que não sejam vices.
- Somente o líder e o vice podem aceitar/recusar solicitações e transferir créditos do cofre.
- Cargos são exibidos na aba MEMBROS; líderes e vices podem revisar pedidos e ver o seletor de cargo.
- Jogadores sem clã passam a SOLICITAR ENTRADA em vez de entrar diretamente; podem cancelar o pedido.
- A entrada é aprovada pelo servidor, com limite mínimo de nível 8 (ou o valor superior definido no ADM).

## Correção Arena / XP

A função claim_arena_daily_reward() ainda utilizava a curva antiga: 10.000 * 2^(nível-2).
Corrigida para a curva atual: round(15.000 * (nível-1)^2,3 * 1,20^(nível-2)).
A interface confere o nível recebido usando a mesma fórmula; sync_arena_profile deixa de usar p_level informado livremente.
A entrada e a promoção em cargos privilegiados verificam nível e XP do perfil + save.

## Auditoria de permissões

- revogada permissão de jogadores na RPC evaluate_clan_level_v12();
- pedidos em tabela própria com RLS e sem grant direto para authenticated;
- permissões para aprovar e transferir verificadas em SECURITY DEFINER com auth.uid();
- membros normais/Elite não podem aprovar, promover, transferir ou declarar guerra;
- os privilégios do vice só abrangem aprovação, cargos subordinados e repasse do cofre; declarações de guerra continuam exclusivas do Líder.

## Migrações do banco (JÁ APLICADAS ao projeto Supabase atual)

Para instalações novas em outro Supabase, aplicar nesta ordem:
1. `sql/STELLAR_V19_0_2_CLAS_ARENA_SECURITY.sql`
2. `sql/STELLAR_V19_0_2_LEVEL_INTEGRITY.sql`
3. `sql/STELLAR_V19_0_2_OFFICER_GUARD.sql`

**Não reaplicar no banco atual sem necessidade.** O ZIP é para atualizar o GitHub/Render.
Nenhum save, saldo ou membro existente foi deletado. O SilasSP (nível 7) continua no registro histórico da aliança e terá o menu bloqueado até atingir nível 8; o novo fluxo de entrada não cria vínculos automáticos.

## Limitações e próximas validações

O combate e alguns dados de progresso ainda usam dados salvos pelo cliente; uma auditoria anti-cheat integral exigirá migrar gradualmente mais operações ao servidor. Esta versão corrige as brechas de acesso do clã e a curva de XP da recompensa Arena, mas não representa uma auditoria integral de todo o jogo.

Testar no Render:
- conta nível 7 tentando abrir clã;
- piloto nível 8 enviando pedido e aguardando;
- líder aprovando, recusando e promovendo;
- vice usando cofre; membro/Elite sem permissão;
- recompensa da Arena e cálculo de nível corretos após reconexão;
- login Google, saves e itens preservados.
