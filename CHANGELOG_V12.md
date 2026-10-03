# Stellar Legacy V12 — Premium, Passe Pago & Clã 2.0

## Segurança e zonas
- Equipamentos, nave ativa, drones e P.E.T. só podem ser configurados dentro da base X-1 da própria facção.
- Portais físicos possuem microzona neutra (raio 180): NPCs deixam de atacar enquanto o piloto estiver dentro dela.
- A microzona de portal não vira trader/base e não concede reparo de HP como a base.

## Passe de Batalha V12
- Trilha FREE mantida com 30 tiers e equipamentos comuns nos marcos.
- Nova trilha PREMIUM: recompensas numéricas 2X, equipamentos Elite nos marcos e Solace no Tier 30.
- O Passe Premium é mensal e vinculado à temporada YYYY-MM no servidor.

## PREMIUM
- PREMIUM 30 dias: reparo de nave destruída gratuito, regeneração de HP/escudo 2X, recarga de míssil 20% mais rápida, 5% de desconto em itens Elite e 10% no Materializador/Galaxy Gate.
- Loja Premium visível para todos.
- Compras reais ainda estão bloqueadas. Somente contas `game_admins.role=admin` podem executar compras de teste, sem cobrança.
- Catálogo em Real contém Passe, assinatura PREMIUM e apenas equipamentos Elite.

## Clã 2.0
- Doação manual removida/bloqueada no servidor.
- 23:00 (São Paulo): cofre rende 5% no LV1 até 10% no LV10.
- 00:00 (São Paulo): coleta automática de 10% dos Créditos atuais de cada membro.
- Repasse do líder continua: o valor bruto sai do cofre, 95% chega ao jogador e 5% é queimado como juros.
- Clãs evoluem automaticamente até o LV10 quando completam XP somado dos membros + quantidade mínima de membros + saldo/custo do cofre + missão interna de aliens.
- Cron jobs do Supabase executam rendimento e coleta uma única vez por data.
- Salvamento V12 protege a cobrança diária contra um navegador aberto tentar sobrescrever o saldo pós-coleta.

## Backend
- Migration principal: `sql/V12_PREMIUM_CLAN_ECONOMY.sql`.
- Novas RPCs de Premium, economia de clã, progresso de clã e compras de teste ADM.
