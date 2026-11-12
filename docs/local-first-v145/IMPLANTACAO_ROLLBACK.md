# Implantação e reversão V145.0

Este pacote é uma migração parcial testável. Não foi publicado. Não execute SQL antigo indiscriminadamente: os arquivos históricos em `tests/fixtures` são dados de teste, não uma sequência de migrações para produção.

## Preparação em homologação

1. Guarde uma cópia da base V144.1 / 47.7.80 e o commit atual do repositório.
2. Aplique o patch de código ao repositório existente, ou extraia todas as partes do projeto completo no mesmo diretório.
3. Execute `npm ci --include=dev`, `npm run check`, `npm test` e `npm run apk:check`.
4. Defina `DATABASE_URL` somente no ambiente escolhido e execute `bash scripts/migrate-v145.sh apply`. O script chama o SQL read-only `sql/STELLAR_V145_PREFLIGHT.sql`: não cria/apaga tabelas, funções, políticas ou dados. Ele verifica a presença do save único, ABC e comandos V134. Não substitui a análise de permissões/configurações de produção.
5. Publique primeiro em um serviço de homologação com configuração equivalente à atual. Não são necessárias novas variáveis de ambiente.
6. Faça login, altere atalhos/munição/CONF, confirme funcionamento do hangar e acompanhe GET/PUT `/api/player/save`. O primeiro estado é integral; alterações pequenas podem carregar `delta_v145`, e a resposta pode trazer `state_delta_v145`.
7. Reinicie o serviço de homologação durante uma pendência e verifique o 409 `DELTA_BASE_MISSING` seguido de reenvio completo com o mesmo operation_id. Isso é recuperação esperada.
8. Teste perda de internet/reabertura no Android real, inclusive combate, posição e missão. Inspecione a fila local e os recibos econômicos existentes.
9. Somente depois de autorização publique no Render principal e distribua um novo APK pelo workflow existente. Esta entrega não fez essas ações.

## ZIPs e instalador

O patch pequeno `Stellar_Legacy_V145_0_PATCH_CODIGO.zip` é compatível com o instalador universal da base enviada: substitui somente arquivos alterados/adicionados, sem excluir assets, e exige a base 47.7.80. O instalador mantém sua proteção de `.github` e de seu próprio script. Use o patch sobre a base original; ele não é um projeto completo para instalação do zero.

Os ZIPs `COMPLETO_PARTE_01` em diante são partes independentes do código-fonte completo com os assets. Extraia TODOS no mesmo diretório, em ordem numérica. Cada arquivo aparece em apenas uma parte; não é necessário concatenar bytes. Essas partes incluem os arquivos protegidos de infraestrutura da fonte original e **não devem ser enviadas ao instalador universal**. Para atualizar o repositório já existente pelo workflow de ZIP, use o patch. Para reconstruir a árvore completa em um computador, use as partes.

Não rode um deploy entre partes de uma reconstrução manual. O patch contém o conjunto cumulativo de código que deve ser aplicado como uma unidade. O workflow que publica automaticamente após testar somente deve ser iniciado quando você decidir autorizar a publicação.

## Rollback

- Restaure o commit/ZIP V144.1 da aplicação e gere o APK correspondente.
- Não apague IndexedDB, game_saves, recibos ou backups: a versão do armazenamento IndexedDB e o esquema SQL não mudaram. As propriedades novas de eventos não exigem migração reversa de dados.
- Opcionalmente execute `bash scripts/migrate-v145.sh rollback`, que apenas lê a instrução de reversão. Não existe DDL V145 a desfazer.
- Reiniciar o Render apaga apenas referências efêmeras de delta. Não apaga progresso. O cliente negocia snapshot integral novamente.

A reversão de código não desfaz compras/recompensas legítimas ocorridas após a atualização. Nunca substitua a base de produção por um fixture de testes para “voltar a versão”.
