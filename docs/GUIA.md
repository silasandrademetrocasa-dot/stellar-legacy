# Stellar Legacy — V143 (47.7.76)

## Instalar a atualização

Este pacote é cumulativo sobre o ZIP completo 47.7.75 fornecido nesta conversa. Não é uma instalação vazia: as artes aprovadas já existentes em public/ são preservadas.

1. Deixe somente o ZIP V143 na raiz do repositório e execute o Instalador Universal atual. Ele substitui os arquivos alterados e remove os 203 caminhos antigos listados em stellar-install.json. Só publica após as verificações e os testes.
2. Para atualizar também o nome e a configuração do workflow APK, substitua `.github/workflows/Instalapk.yml` pelo arquivo `Instalapk.yml` entregue junto ao ZIP. O instalador universal protege `.github/`, portanto essa substituição é manual. Os ajustes essenciais de empacotamento e auditoria também estão no Gradle e funcionam com o workflow APK atual.
3. Remova manualmente `.github/workflows/ativar-offline.yml`: é um fluxo antigo de substituição do projeto online por outro protótipo. Não o execute para gerar este jogo.
4. No GitHub Actions, execute **APK LOCAL**. Baixe o APK no artefato Debug; para produção use `build_release` com os secrets de assinatura já existentes. Mantenha a mesma chave de assinatura para atualizar um APK já instalado. Um debug assinado com outra chave não atualiza uma instalação release.

Nenhum SQL novo precisa ser executado para a V143. Nenhum dado de jogador nem objeto do banco é removido nesta limpeza.

## O que fica no aparelho

O Android empacota diretamente toda a árvore public/: telas, JavaScript, CSS, JSON, ícones, naves, designs, NPCs, drones, AUX, bases, mapas e demais recursos estáticos. Não há download inicial ou fallback de artes pelo Render. Um recurso ausente resulta em erro local e reprovação da auditoria; não é buscado no servidor.

O mesmo roteamento atende a página e os Service Workers. Cache HTTP é desativado para o conteúdo do APK; caches PWA antigos com prefixo `stellar-shell-` são retirados antes de iniciar o jogo. Sessões, IndexedDB e saves não são apagados.

Login, validação de saldos, compras, vendas, recompensas, salvamentos e multiplayer continuam online em `/api`, `/ws` e `/health`. Não se trata de um modo de jogo offline. Recursos de outros hosts não são carregados dentro do WebView; links externos continuam no navegador do Android. O fluxo Google OAuth com retorno ao APK ainda exige App Links dedicado, como antes.

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

Validação desta entrega: regressões e inventário executados localmente. O ambiente desta revisão não possui SDK Android/Gradle; a compilação do APK e o teste no aparelho devem ser feitos pelo workflow. No primeiro teste, confira loading de Natal, hangar, designs, mapas, áudio disponível, login e sincronização. Uma perda de internet deve impedir ações online, mantendo a apresentação local disponível.
