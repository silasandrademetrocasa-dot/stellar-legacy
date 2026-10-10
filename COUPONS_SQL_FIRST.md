# STELLAR LEGACY V18.2.1 — CUPONS POR SQL (SEM ZIP NAS PRÓXIMAS CAMPANHAS)

## Instalação inicial (uma única vez)

1. Execute `sql/V18_2_1_COUPONS_SQL_FIRST.sql` no **Supabase SQL Editor**. **A instalação da estrutura já foi aplicada no projeto de produção em 10/10/2026.** Não execute novamente por obrigação; a migração é idempotente na estrutura, mas recria o gatilho (sem apagar resgates).
2. Instale o **ZIP V18.2.1** pelo instalador GitHub habitual. O Render deve executar `18.2.1` após o deploy.
3. Jogo → **LOJAS → LOJA PREMIUM → RESGATE ONLINE**. Digite um cupom SQL, clique **RESGATAR**. A operação precisa da sessão válida.
4. O código anterior AUX-SENT-EBA45E93597283F9CD9A6CD7 foi migrado para o novo sistema sem alterar o texto do código e sem consumi-lo. A função de resgate da versão antiga foi desativada para evitar duas portas para o mesmo prêmio.

A tela mostra apenas o campo para resgate; os cupons e seus prêmios são definidos EXCLUSIVAMENTE pelo banco. O front-end nunca concede cupons SQL por conta própria.

## Próximos cupons: APENAS SQL

Cole os trechos a seguir no SQL Editor e ajuste `code`, `title`, `rewards` e `max_uses`. Não precisa criar novos arquivos, atualizar GitHub ou recompilar o jogo para cada código.

### 1. AUX-9 + Sentinela (um vencedor)

```sql
INSERT INTO public.game_coupons_v1821
  (code, title, rewards, max_uses)
VALUES
  ('AUXSENT-OUTUBRO-01', 'AUX-9 + Modo Sentinela',
   '[{"kind":"aux_sentinel"}]'::jsonb, 1);
```

O código só pode ser resgatado por **uma única conta**. Se o jogador já possuir AUX-9 sem Sentinela, ele recebe o Sentinela. Se já possuir ambos, o sistema impede o uso do cupom, sem consumi-lo.

### 2. Stellarium, créditos e munição (20 vencedores)

```sql
INSERT INTO public.game_coupons_v1821
 (code, title, rewards, max_uses, min_level, expires_at)
VALUES
 ('FROTA-OUTUBRO-2026', 'Reforço da Frota',
  '[{"kind":"uridium","amount":5000},
    {"kind":"credits","amount":100000},
    {"kind":"ammo","id":"lcb10","qty":500}]'::jsonb,
   20, 5, '2026-10-31 23:59:59-03');
```

O mesmo jogador pode resgatar **uma vez**; o servidor não aceita segunda tentativa desse código. O campo `max_uses` determina quantas contas diferentes conseguem usá-lo.

### 3. Módulo isolado para quem já possui AUX-9

```sql
INSERT INTO public.game_coupons_v1821(code,title,rewards,max_uses)
VALUES ('MODULO-GUARD-01','Sentinela para AUX existente',
 '[{"kind":"pet_gear","id":"guard"}]'::jsonb,5);
```

### 4. Equipamento da Loja (consulte os IDs válidos primeiro)

```sql
SELECT kind, ref_id FROM public.live_shop_prices_v16
WHERE enabled = true AND kind IN ('laser','generator','extra','ammo','rocket','ship')
ORDER BY kind,ref_id;

-- Substitua o ID do exemplo por um ref_id válido listado na consulta acima.
INSERT INTO public.game_coupons_v1821(code,title,rewards,max_uses)
VALUES ('LASER-EXEMPLO-01','Laser de evento',
 '[{"kind":"inventory","id":"lf3","qty":1}]'::jsonb,10);
```

O resgate recusa um ID inexistente ou desligado na Loja. Para naves, use `{"kind":"ship","id":"goliath"}` se ela estiver no catálogo. Outros tipos aceitos: `aux9` (AUX sem Sentinela), `pet_gear`, `credits`, `uridium`, `inventory`, `ammo`, `rocket`, `ship` e `aux_sentinel`. Outros prêmios (Premium/dias, designs e drones) exigirão expansão específica do motor, não basta inventar um tipo.

### 5. Criar códigos únicos em lote

```sql
INSERT INTO public.game_coupons_v1821(code,title,rewards,max_uses)
SELECT 'FROTA-' || upper(encode(extensions.gen_random_bytes(8),'hex')),
       'Bônus especial de evento',
       '[{"kind":"uridium","amount":1500}]'::jsonb,
       1
FROM generate_series(1,10)
RETURNING code,title,max_uses;
```

Guarde os códigos retornados para distribuir aos jogadores. Não publique a lista inteira, já que cada código representa um prêmio resgatável.

## Operações administrativas por SQL

```sql
-- Consultar todas as campanhas e resgates:
SELECT code,title,active,redeemed_count,max_uses,starts_at,expires_at
FROM public.game_coupons_v1821 ORDER BY created_at DESC;

-- Desativar um código:
UPDATE public.game_coupons_v1821 SET active=false
WHERE code='AUXSENT-OUTUBRO-01';

-- Prorrogar uma campanha:
UPDATE public.game_coupons_v1821
SET expires_at='2026-11-30 23:59:59-03'
WHERE code='FROTA-OUTUBRO-2026';

-- Quem já resgatou, sem expor e-mails:
SELECT code, COUNT(*) AS total_resgates
FROM public.game_coupon_redemptions_v1821
GROUP BY code ORDER BY total_resgates DESC;
```

## Proteções

- O resgate exige conta autenticada E sessão vigente no servidor do jogo (`requireUser`).
- A função SQL é transacional: **um cupom não é gasto se a recompensa não puder ser concedida**.
- O código é consumido no máximo uma vez por conta, com trava na linha para respeitar o limite total mesmo durante resgates simultâneos.
- Recompensas são limitadas a tipos e quantidades predefinidos; o cliente não decide seus valores.
- As tabelas de campanha não são públicas (`RLS` ativo e sem permissão de leitura ou escrita para jogadores).
- O save possui marcação `couponClaimsV1821`; uma aba antiga não consegue apagar o prêmio já resgatado. Clientes antigos deverão atualizar a página para sincronizar um prêmio recém-recebido.
- **Nota para o ADM:** não exclua as marcas de `couponClaimsV1821` do save durante manutenções manuais; elas fazem parte da proteção.
- O resgate atualiza o save e devolve o estado novo ao jogo. Não cria pagamento e não precisa de compras reais.

## Verificação

Os testes do Supabase foram executados em transações finalizadas com `ROLLBACK`: AUX+Sentinela, prêmios mistos, resgate repetido e bloqueio de saves antigos. Nenhum jogador real foi alterado nos testes. Os testes de integração ponta a ponta no navegador publicado ainda dependem do deploy V18.2.1.
