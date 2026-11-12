# Stellar Legacy V142.1 — preços dos designs natalinos

Versão técnica 47.7.75. Pacote cumulativo compatível com V141 / 47.7.73 e V142 / 47.7.74. Inclui a V142 de boxes natalinas 24h e coleta unificada.

Suba o ZIP pela rotina habitual do instalador universal. O SQL de preços já foi aplicado e verificado no Supabase; a cópia em `sql/STELLAR_V142_1_PRECOS_DESIGNS.sql` é o registro reproduzível da mudança. O SQL da V142 também já estava aplicado.

## Valores atuais em STL

| Nave | Tradicionais por design |
|---|---:|
| Lynx | 1.800.000 |
| Valkyrie | 2.800.000 |
| Leviathan | 5.000.000 |
| Striker | 6.000.000 |

Brasil, Estados Unidos, Japão, Espanha e Portugal da Leviathan: **25.000.000 STL por design**, correspondendo a 10× os 2.500.000 STL do casco.

Solstice, Arctic, Midnight, Orion e Crimson: **6.000.000 STL por design**. As naves correspondentes são exclusivas de evento e não têm preço de loja; o piso adotado é 2× o maior preço de nave em STL no catálogo atual (3.000.000).

Pathfinder Cristal e Kensei Vulcão Natalino continuam exclusivos do passe, com as condições de resgate existentes. A atualização não transforma esses designs em itens de compra nem remove designs já adquiridos.

## Uma fonte de preço

O preço é calculado no SQL a partir de `live_shop_prices_v16`: 2× para tradicionais e 10× para os países atuais. Para cascos sem valor positivo em STL, a referência é o maior preço de nave em STL do catálogo, com mínimo de 2.500.000. Assim, futuros ajustes no preço do casco passam automaticamente ao preço do design.

A loja recebe esses valores pelo status natalino existente. O cliente deixou de usar o preço fixo do catálogo visual para exibir e confirmar a compra. A confirmação informa o total em STL.

O SQL compara o preço confirmado na tela com o preço atual antes de descontar. Clientes antigos ou com preço desatualizado recebem uma mensagem para atualizar a loja; não são cobrados por um valor maior que o exibido. Atualizar este ZIP é necessário para mostrar e confirmar os novos preços. Essa conferência é um controle de consistência; a autorização de compra continua no servidor.

## Validação

694 testes passaram, incluindo funções SQL em PostgreSQL de teste: cálculo dos dois multiplicadores, piso dos eventos, exclusividade do passe, preço exibido, bloqueio de cotação ausente/incorreta sem débito, compra correta, repetição sem nova cobrança e mudança dinâmica do preço da nave.

No banco real, foram alteradas as definições dos 30 designs de loja e as funções de cálculo/status/validação. Nenhuma moeda, inventário ou compra de jogador foi alterada para testar.
