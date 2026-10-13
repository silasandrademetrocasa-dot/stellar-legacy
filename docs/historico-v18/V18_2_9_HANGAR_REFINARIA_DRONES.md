# Stellar Legacy V18.2.9 — Hangar Refinaria e Economia

- Refinaria e crafting: Hangar > REFINARIA em qualquer mapa, autorizados pelo servidor.
- Base X-1: posto de venda do porão e serviços exclusivos de base, sem refinaria.
- EXTRA **Terminal Mercante Remoto Elite** (350.000 STL inicialmente): comprado na Loja > Extras, equipado na base e habilita vendas manuais do porão na aba Hangar > REFINARIA em qualquer mapa. Os demais extras continuam exigindo equipar na base.
- AUX-9 Salvager: recolhe caixas de carga no porão, nunca converte automaticamente os minérios em Créditos. Caso o porão fique cheio, preserva os recursos restantes da caixa enquanto ela existir.
- Drones Halo (comum): base 10.000.000 Créditos. Nova (Elite): base 15.000 STL. Cada compra do MESMO TIPO dobra: 1ª 1×, 2ª 2×, ..., 8ª 128×. O progresso histórico de compras não regride com venda; compras antigas são inferidas no mínimo pelos drones possuídos. Premium mantém 5% de desconto nas compras STL.
- Valores base de Halo, Nova e Terminal Mercante Remoto: EDITÁVEIS no painel ADM > LOJAS. Mudar valor base ou multiplicador em ADM > LOJAS afeta as compras futuras; salvar recompõe as configurações em tempo real.
- SQL de catálogo e trigger anti-save-antigo inclusos; Supabase já atualizado. Não é necessário executar o SQL.
- Somente um tipo de recurso é vendido quando selecionado; o AUX nunca ativa vendas.
