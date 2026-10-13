# Stellar Legacy V18.2.15 — Passe + Kits Elite + Naves de Evento (TESTE)

- Reorganiza Loja Premium: níveis do Passe agora aparecem na MESMA aba do Passe de Batalha; remove aba NÍVEIS independente.
- Adiciona aba EQUIPAMENTOS com ELITE I (R$19,90), ELITE II (R$49,90), EVENTO Phantom (R$69,90), EVENTO Seraph (R$99,90).
- Todos os IDs existem no jogo: lf3, lf4, sg3nb02, g3n7900, repElite, extraSlotCpuElite; naves defcom (Phantom) e aegis (Seraph).
- Kits + naves: LIMITE de uma simulação de compra por conta, preservado pelo Supabase com trigger.
- Prévia de teste: nenhum equipamento, STL, nave, Premium ou recompensa real é entregue; Mercado Pago continua escolha planejada para checkout WEB, ainda NÃO integrado.
- A loja existente, recargas STL, descontos Premium, saves, NPCs, sprites e recursos foram preservados.

## Publicar
1. Migração SQL V18.3.6 já executada no Supabase; NÃO repetir.
2. Suba o ZIP COMPLETO V18.2.15 via instalador GitHub e aguarde Render.
3. Abra Loja Premium → PASSE + NÍVEIS ou EQUIPAMENTOS. É uma prévia/simulação, não uma loja com pagamento real.

## Limites de segurança
- Naves de evento são descritas por ID real mas sua entrega NÃO existe nesta fase.
- Antes de permitir compras com dinheiro: finalizar checkout, verificações de pedidos e webhooks, entrega idempotente, política de raridade e elegibilidade de eventos, reembolso, limites de inventário e testes de fraude.
