# Stellar Legacy V113.1 — Forja de protocolos AUX-9

## Contrato de progressão

| Tier | Local / nível AUX | Cópias consumidas | Fragmentos consumidos | Preço inicial |
| --- | --- | --- | --- | --- |
| N1 | Base X-1/X-8, AUX 1 | — | — | Dano/HP/Escudo 50.000 STL; Box/Porão 100.000.000 CR por unidade |
| N2 | Base própria, AUX 8 | 4× N1 da mesma família | 10 Fragmentos Apex | 250.000 STL |
| N3 | U-1/U-2/U-3, AUX 15 | 4× N2 da mesma família | 10 Fragmentos do Universo | 500.000 STL + 180.000.000 CR |

A cada fabricação, o servidor desconta as 4 unidades de entrada e os 10 fragmentos e concede 1 unidade nova do tier seguinte. Os preços de N2/N3 são pisos ajustáveis pelo ADM; não é possível reduzir a quantidade de insumos pelo navegador. O preço de N1 continua definido pelo catálogo de cada família.

## Origem dos fragmentos

- **Apex Overlord:** 10% de chance de 1 Fragmento Apex por abate online validado, apenas para o dono do abate.
- **NPCs nos mapas do Universo U-1/U-2/U-3:** 10% de chance de 1 Fragmento do Universo por abate online validado, apenas para o dono do abate.
- Os fragmentos servem às cinco famílias, mas tipos Apex e Universo não se substituem.
- Não há fragmentos automáticos no Farm Offline nesta versão; não alteramos seu pagamento.
- Sorteio, livro de recibos por (jogador, abate) e crédito acontecem **na mesma transação PostgreSQL** da recompensa NPC. Repetir o mesmo abate não realiza novo sorteio.

## Exemplo: um N3 do zero

- Comprar **16 N1** da mesma família.
- Fabricar **4 N2**, consumindo os 16 N1, **40 Fragmentos Apex** e **1.000.000 STL**.
- Fabricar **1 N3**, consumindo os 4 N2, **10 Fragmentos do Universo**, **500.000 STL** e **180.000.000 CR**.
- Para Dano/HP/Escudo, as compras N1 somam **800.000 STL**; total de STL com craft: **2.300.000 STL**.
- Para Box/Porão, as compras N1 somam **1.600.000.000 CR**; total: **1.500.000 STL e 1.780.000.000 CR**.

São valores acumulados esperados para fabricar uma unidade N3 sem compras anteriores, não descontos aplicados instantaneamente.

## Administrador

**ADM → Lojas → AUX-9** permite ajustar: N1 por família, N2 em STL (piso 250 mil), N3 em STL (piso 500 mil) e créditos (piso 180 milhões), bem como chance de Apex/Universo (0–25%, padrão 10%). Os ajustes não mudam a receita 4+10.

## Homologação recomendada

1. Salve o saldo/inventário antes de comprar N1 e faça quatro compras. Confira as quatro unidades separadas.
2. Tente craft N2 sem fragmentos: deve recusar sem descontar STL.
3. Com 10 fragmentos obtidos legalmente, fabrique N2; confirme consumo 4× N1 e 10× Fragmento Apex.
4. Valide N3 exclusivamente em U-1/U-2/U-3 com 4× N2 e 10× Fragmento do Universo; confirme os dois débitos monetários.
5. Abata Apex repetidamente em ambiente de teste e confirme a probabilidade aproximada sem resgates duplicados após reconectar.
6. Troque CONF1/CONF2, feche o navegador, reabra e confirme o equipamento/estoque.
7. Confirme que Farm Offline, Autopilot, leilão e recebimento de CR/STL do NPC não sofreram regressão.

**SQL:** as tabelas e a função de entrega foram aplicadas no Supabase. Não rode o arquivo de migração novamente no instalador; ele fica para auditoria. 
