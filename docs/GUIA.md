# Stellar Legacy — V143.2 (47.7.78)

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
