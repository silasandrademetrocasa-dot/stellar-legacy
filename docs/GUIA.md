# Stellar Legacy — V144 (47.7.79)

## Entrega cumulativa: mapas, formações e HUD compacto

Instale sobre **V143.2 / 47.7.78** com o Instalador Universal já existente. Coloque somente `Stellar_Legacy_V144_MAPAS_FORMACOES_HUD_CUMULATIVA.zip` na raiz do repositório. O manifesto verifica a versão base. Este pacote contém todas as mudanças V144; os recursos da V143.2 permanecem no repositório. Não é uma instalação vazia. Não apague artes ou módulos antigos manualmente: os fallbacks ainda referenciados são necessários.

**SQL: aplicação online não confirmada.** A chamada de migração foi interrompida sem devolver confirmação. O arquivo `supabase/migrations/20261112030426_combat_tactics_v144.sql` está incluído, é reaplicável e deve estar aplicado antes de publicar o cliente/servidor V144. Não execute os SQLs de `tests/fixtures` em produção. Nenhum saldo ou formação especial foi concedido a contas reais nesta entrega.

Após o deploy, gere e instale um novo APK pelo workflow existente. A versão web recebe as mudanças no deploy; um APK instalado só recebe os novos arquivos locais quando for atualizado. Os gráficos continuam incorporados no APK, e a validação de dados permanece online.

## Alterações realizadas

- HUD inferior com 12 atalhos em duas fileiras de seis, independentes em CONF1/CONF2. Barra recolhível e habilidades em gaveta separada. Toque longo de 500 ms, botão direito ou engrenagem abre a edição; não foi criado um inventário permanente ampliado.
- Atalhos para munições, mísseis e formações reutilizam seleção, consumo e configuração existentes. Quantidades, seleção e indisponibilidade continuam visíveis.
- Nove formações com os percentuais aprovados. Original é padrão. As oito especiais ficam visíveis para prévia, mas bloqueadas até haver propriedade válida no save do servidor: o brief não definiu aquisição, preços ou concessão, portanto nada foi inventado.
- Movimentos próprios por formação e transformação de 0,75 segundo usando os IDs reais dos drones. Comuns e raras em 2D; épicas e lendárias com profundidade simulada, escala e ordem de desenho. Nenhuma troca duplica, remove ou redistribui equipamentos.
- Bônus e visual da formação só passam a valer após confirmação canônica. Mudança preserva proporcionalmente HP/escudo e não recarrega recursos; o dano recebido durante a gravação é conservado.
- Trinta mapas existentes com novas composições de cinco famílias: Terra, Marte, Júpiter, PvP e Universo. Fundos alto 2048, médio 1024, baixo 512 e textura de minimapa 256. Os cinco originais foram gerados em 1254×1254 e reamostrados para exportação 2048: não são arte nativa 2K. As trinta composições usam recortes/variações desses cinco originais. Mapas Astrais não foram substituídos.
- Minimap e cenário usam o mesmo recorte e coordenadas do mundo, com indicação do enquadramento atual. Portais, bases, AUX, marcadores e dimensões lógicas existentes são mantidos.

## Caminhos e validação reutilizados

`combat-hud-v144.js` → seleção atual ou `saveCombatHudV144` → coordenador de gravação existente → **PUT /api/player/save** → `prepareCombatTactics` → `writeVerifiedSave` → **stellar_player_commit**, módulo `checkpoint` → **game_saves.state** → trigger V144 → retorno canônico/ACK.

O novo campo `combatHudV144` contém apenas os dois perfis e atalhos. `ownedDroneFormationsV144` é propriedade reservada do servidor. Não há uma segunda tabela de save, um endpoint paralelo de formações ou novos preços. Clientes antigos não podem apagar esses campos ao omiti-los. O multiplayer transmite apenas metadados obtidos do save canônico e anima localmente; não envia posições individuais por frame.

## Percentuais aprovados

| Formação | Dano | HP | Escudo | Velocidade |
|---|---:|---:|---:|---:|
| Original | 0% | 0% | 0% | 0% |
| Fúria | +18% | -10% | -8% | 0% |
| Interceptor | -10% | 0% | -8% | +18% |
| Bastião | -6% | 0% | +22% | -12% |
| Colosso | -12% | +22% | 0% | -6% |
| Vanguarda | +14% | -10% | -8% | +14% |
| Prisma | +14% | -6% | +14% | -10% |
| Caçador Supremo | +16% | -6% | -12% | +18% |
| Leviatã | -6% | +18% | +18% | -12% |

## Regressões e limites da conferência

A suíte completa passou com **236 testes, zero falhas e zero omitidos**, incluindo PostgreSQL isolado/PGlite, reenvio de operação, ACK perdido, recompensa de NPC concorrente, backup canônico, propriedade de formações, independência de CONF, conservação de itens e munições, interface DOM real e roteamento nativo Java compilado com ECJ e executado em JVM. Sintaxe/imports e inventário do APK também foram verificados: 1.352 arquivos locais, 1.103 imagens, aproximadamente 119,09 MiB descompactados; isso não é o tamanho do APK final nem a RAM usada.

A prévia HTML separada contém dados fictícios e libera as nove formações somente para demonstração visual, sem conectar ao banco ou alterar contas. Ela não é uma captura de tela do jogo. O navegador deste ambiente bloqueou a prévia local; por isso **a aparência em WebView/aparelho, o APK completo e FPS mobile ainda precisam de validação real**. O benchmark do solver mede somente CPU em Node, não desempenho gráfico do celular.

Execute `npm ci --include=dev --ignore-scripts`, `npm run verify` e `npm run apk:check`. Para exigir os testes Java, use JDK 17 e `STELLAR_REQUIRE_JAVA_TEST=1`. O workflow APK continua responsável pela compilação Android e auditoria do pacote real.

No aparelho, conferir: 12 slots em retrato/paisagem; recolher/abrir habilidades; alternar CONF e reabrir; atirar/comprar/coletar durante saves; trocar formação já possuída sem cura; radar alinhado nos cinco cenários; chat/ranking/Arena/resgates. Não confundir o acesso liberado na prévia com propriedade de itens na conta real.

---

## Base preservada da V143.2


## Instalar a atualização

Este ZIP é cumulativo sobre a V143 (47.7.76) ou V143.1 (47.7.77), usando o Instalador Universal existente. Já inclui a correção de conexão Supabase da V143.1. Deixe somente o ZIP V143.2 na raiz e execute o instalador. Não é uma instalação vazia; as artes existentes são preservadas.

Depois execute **APK LOCAL** e instale o APK recém-gerado no aparelho. A correção inclui código Java nativo: atualizar somente o site não atualiza o APK já instalado. O workflow entregue com a V143 pode ser mantido. A mesma chave de assinatura é necessária para atualizar a instalação existente sem desinstalar.

Nenhum SQL novo precisa ser executado. Não foram alteradas funções, permissões, saldos nem resgates no banco.

## Correção da conexão no APK

A V143 havia liberado somente dados do Render, bloqueando as consultas diretas do cliente ao Supabase. As chamadas de ranking, histórico/envio de chat, Arena, presença, clãs, leilão e vários resgates usam REST/RPC do Supabase e eram tratadas como conteúdo externo proibido. O navegador web não tinha essa restrição.

Agora o cliente lê `/api/config` e informa somente a URL pública à ponte nativa antes de qualquer chamada ao Supabase. O Android fixa um único host HTTPS exato para a Activity e permite nesse host somente `/rest/v1` (incluindo RPCs) e `/auth/v1`. A regra vale para WebView e Service Workers. Imagens, scripts, CSS, Storage e outros hosts continuam bloqueados como fontes remotas de apresentação. Tokens, chaves e corpos de operações não passam pela nova ponte; seguem nos pedidos HTTP autenticados já existentes. Nenhuma operação econômica é repetida pela ponte.

Se um cliente novo encontrar um APK antigo sem essa capacidade, a mensagem orienta a atualizar o APK. Uma configuração recusada pode ser consultada novamente, sem disparar a operação ao Supabase.

## AUX e ícone de Natal

O AUX mantém o sprite único aprovado em vista superior. Agora gira no plano do mapa para apontar na direção do movimento, com virada limitada e suavizada pelo menor arco; parado, conserva a última direção. O mesmo comportamento é usado no próprio AUX e nos AUX de outros jogadores. A correção não usa atlas com inclinação em 3D e não muda velocidade de voo, alcance de coleta ou recompensa. O texto do AUX continua reto fora da transformação da imagem.

O ícone natalino do APK substitui a arte antiga e tem recurso adaptativo para launchers redondos ou quadrados. Arte gerada com a logo metálica STELLAR LEGACY, estrela orbital ciano, gorro vermelho, neve e espaço azul escuro. Direção final da arte: preservar o logotipo central na zona segura e prolongar o fundo espacial até as bordas, sem moldura. Arquivo de produção: `android/app/src/main/res/drawable-nodpi/stellar_icon.png`, preparado em 512×512 para o aplicativo. A imagem de alta resolução foi criada no gerador integrado; o build usa somente o recurso local.

Gere e instale o APK novo para atualizar o ícone e a ponte de conexão; o ajuste do AUX também funciona na web após o deploy. A validação completa em WebView e no launcher do aparelho permanece necessária.

## O que fica no aparelho

O Android empacota diretamente toda a árvore public/: telas, JavaScript, CSS, JSON, ícones, naves, designs, NPCs, drones, AUX, bases, mapas e demais recursos estáticos. Não há download inicial ou fallback de artes pelo Render. Um recurso ausente resulta em erro local e reprovação da auditoria; não é buscado no servidor.

O mesmo roteamento atende a página e os Service Workers. Cache HTTP é desativado para o conteúdo do APK; caches PWA antigos com prefixo `stellar-shell-` são retirados antes de iniciar o jogo. Sessões, IndexedDB e saves não são apagados.

Login, validação de saldos, compras, vendas, recompensas, salvamentos e multiplayer continuam online em `/api`, `/ws` e `/health` no Render e em `/rest/v1` e `/auth/v1` no host exato do Supabase. Não se trata de um modo de jogo offline. Outros recursos remotos não são carregados dentro do WebView; links externos continuam no navegador do Android. O fluxo Google OAuth com retorno ao APK ainda exige App Links dedicado, como antes.

Recursos visuais novos exigem uma nova versão do APK. Alterar apenas os arquivos do Render não troca as artes de um APK já instalado. O conjunto atual ocupa aproximadamente 110 MiB descompactado; não é uma estimativa do tamanho final do APK nem da memória gráfica em uso.

## Organização mantida

- `public/` e `server/`: código e recursos usados pelo jogo.
- `docs/GUIA.md`: este guia único, substituindo relatórios e roteiros de versões antigas.
- `sql/`: somente as duas últimas atualizações de Natal já aplicadas; não são um bootstrap de banco vazio.
- `tests/`: regressões de saves, transações, combate, equipamentos, coleta, economia, artes e APK. Não são arquivos embarcados no aplicativo.
- `tests/fixtures/`: banco isolado e SQL histórico estritamente necessário às regressões. Nunca aplicar esses fixtures em produção.
- `scripts/`: instalador e verificações atuais. Benchmarks e scripts destrutivos antigos de poda foram retirados.

As migrações antigas removidas do repositório continuam recuperáveis no ZIP completo original fornecido. Esta limpeza não recria nem desativa RPCs em produção.

## Conferências

`npm ci --include=dev --ignore-scripts` instala as dependências travadas. `npm run verify` verifica a sintaxe, imports, referências visuais e executa as regressões, com PostgreSQL isolado via PGlite; não conecta ao Supabase de produção.

`npm run apk:check` inventaria e confere todos os recursos locais. O Gradle repete essa etapa antes do build e, após `assembleDebug`/`assembleRelease`, confere tamanho e SHA-256 de cada recurso dentro do APK real. Arquivos faltantes, alterados, duplicados ou extras reprovam a compilação. Os relatórios ficam em `android/build/reports/` e são anexados pelo novo workflow.

A política nativa também tem testes executáveis em Java. Sem JDK eles aparecem explicitamente como não executados; no workflow APK novo, Java 17 é instalado antes dos testes e a execução é obrigatória.

Validação desta entrega: 226 testes aprovados, sem falhas ou testes omitidos; inclui compilação Java da política de roteamento com ECJ e execução real na JVM, além de simulações do transporte usando as funções reais de configuração e requisição. Inventário do APK conferido. A configuração pública do servidor e o endpoint público de autenticação responderam HTTP 200. Nenhum resgate de jogador foi executado nesta validação.

O ambiente ainda não possui SDK Android/Gradle: a compilação do aplicativo completo e o teste em WebView no aparelho ficam para o workflow. Após instalar, valide ranking, chat, atualização da Arena e um resgate disponível. Esses testes em aparelho não foram realizados nesta revisão.
