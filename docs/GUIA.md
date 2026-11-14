# Stellar Legacy — V146.1 (47.8.1)

Instruções atuais: [correções de coleta, login e base](correcoes-v1461/LEIA_PRIMEIRO.md). O material abaixo é histórico de versões anteriores.

# Stellar Legacy — V146.0 (47.8.0)

Leia primeiro [a entrega V146](local-first-v146/LEIA_PRIMEIRO.md). O texto abaixo é histórico da V144.1 e não substitui as instruções atuais.

# Stellar Legacy — V144.1 (47.7.82)

## Instalação

ZIP cumulativo sobre **V144 / 47.7.79**, usando o Instalador Universal existente. Coloque somente `Stellar_Legacy_V144_1_LOJA_FORMACOES_HUD18_CUMULATIVA.zip` na raiz e execute o workflow atual. O manifesto exige a V144. O pacote inclui os recursos e mudanças da V144, além das correções V144.1. Não é uma instalação vazia e não remove arquivos ainda referenciados.

**SQL V144 e V144.1 já aplicados e verificados no Supabase. Não precisa executar novamente.** As migrações em `supabase/migrations` registram a evolução; nunca aplique os fixtures de testes ao banco real. Nenhuma formação foi concedida gratuitamente e nenhuma compra foi feita em conta de jogador durante a validação.

Depois do deploy, gere e instale um novo APK pelo workflow existente para receber a interface e os recursos novos. A mesma assinatura deve ser mantida para atualizar o aplicativo instalado. O pacote de atualização não é um APK compilado.

## Loja → Drones → Formações

| Formação | Raridade | Valor | Moeda |
|---|---|---:|---|
| Original | Base | Grátis | — |
| Fúria | Comum | 500.000.000 | CR |
| Interceptor | Comum | 650.000.000 | CR |
| Bastião | Rara | 1.200.000.000 | CR |
| Colosso | Rara | 1.500.000.000 | CR |
| Vanguarda | Épica | 1.500.000 | STL |
| Prisma | Épica | 2.000.000 | STL |
| Caçador Supremo | Lendária | 4.000.000 | STL |
| Leviatã | Lendária | 5.000.000 | STL |

O desbloqueio é permanente e pode ser usado nas duas configurações. Comprar não equipa automaticamente nem troca equipamentos. A formação obtida aparece como Obtido; não é possível comprá-la repetidamente. Esses produtos não recebem desconto Premium. Os preços ficam no catálogo SQL existente `live_shop_prices_v16`, chaves `formation:<id>`.

## HUD inferior

- Duas fileiras de nove: **18 atalhos**, independentes em CONF1/CONF2, ocupando a largura inferior.
- Os 12 atalhos anteriores são conservados; os seis novos começam vazios. Clientes antigos com 12 slots não apagam os slots 13–18 já salvos pela versão nova.
- O botão de reabrir fica na barra superior do próprio HUD, fora do conteúdo oculto. Ao recolher, permanece uma pequena aba visível. O estado usa a preferência existente, incluindo os controles gerais de interface.
- Habilidades ficam em uma gaveta retrátil; munições e mísseis mantêm quantidades, seleção, consumo e cooldown existentes. Toque longo, botão direito ou engrenagem abre o editor.
- Minimap e chat são posicionados acima da barra para evitar disputa pelo rodapé.

## Save e compra validados no servidor

Loja e formação usam **POST /api/player/purchase**, a rota de compra existente → bloqueio por jogador → catálogo do servidor → concessão validada → **stellar_player_commit**, módulo `purchase` → `game_saves.state` + recibos existentes na mesma transação. Não há nova rota de compra, nova carteira ou novo save.

`ownedDroneFormationsV144` só pode aumentar por uma compra válida ou administração SQL autorizada. O banco confere uma única formação nova, a moeda e o débito exato do catálogo. `serverFormationPurchaseV1441` guarda apenas a referência da última compra para impedir que duas intenções concorrentes da mesma formação sejam mescladas com duas cobranças. Checkpoints não podem forjar essa referência. O mesmo identificador de operação recupera o recibo, sem cobrar novamente.

Atalhos continuam em `combatHudV144` dentro do save único, via **PUT /api/player/save** e módulo `checkpoint`. Os bônus percentuais aprovados, transição de 0,75 s, movimentos e IDs/equipamentos reais dos drones são mantidos. Visual e bônus da formação dependem do estado confirmado.

## Mapas e recursos da V144 preservados

Trinta composições existentes usam cinco famílias de cenários: Terra, Marte, Júpiter, PvP e Universo. Fundo alto 2048, médio 1024, baixo 512 e radar 256. As cinco artes originais foram geradas em 1254×1254 e reamostradas para a exportação 2048; não são originais nativos 2K. As trinta composições usam variações/recortes dessas cinco artes. Astrais permanecem como antes.

Cenário e minimapa compartilham recorte e coordenadas do mundo. Portais, bases, AUX, marcadores e dimensões lógicas foram preservados.

## APK e verificações

Todo `public/` permanece incorporado localmente no APK. O aplicativo não baixa imagens, JavaScript ou CSS do Render. Dados e multiplayer continuam online no Render e no host Supabase autorizado; não é um modo offline. Alterar o site não altera os recursos de um APK já instalado.

Validação: **239 testes aprovados, zero falhas e zero omitidos**; sintaxe/imports e auditoria dos recursos locais do APK aprovadas. Inclui PostgreSQL isolado/PGlite, débito + propriedade + recibo, replay, tentativa concorrente de duplicar compra, rejeição de débito incorreto, propriedade forjada, migração 12→18, proteção da cauda contra cliente antigo, CONF independentes e controle de reabertura fora da área recolhível. Os testes Java da política nativa foram compilados com ECJ e executados na JVM.

O SQL online foi conferido: oito produtos ativos na aba Drones, todos retornados pelo catálogo atual; proteção do save habilitada; função auxiliar sem execução pública e sem SECURITY DEFINER. Não foram feitas compras reais nem alterações em saldo de jogador.

Ainda é necessária a conferência visual em aparelho/WebView, incluindo retrato e paisagem, além da compilação Android pelo workflow. Não foi medida taxa de FPS mobile nesta revisão. Os testes DOM não substituem essa validação visual.

Comandos: `npm ci --include=dev --ignore-scripts`, `npm run verify`, `npm run apk:check`. Com JDK 17, use `STELLAR_REQUIRE_JAVA_TEST=1` para exigir os testes nativos.
