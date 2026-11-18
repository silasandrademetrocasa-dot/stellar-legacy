# Stellar Legacy V146.5 — correção do checkpoint web

Atualização cumulativa de código-fonte 47.8.5, aplicada ao projeto existente. Inclui as correções anteriores V146 a V146.4. Não é um jogo independente nem um APK compilado; os recursos originais permanecem no projeto.

## Problema e mudança

Foi identificado no código um caminho reproduzível em que uma diferença entre a montagem de equipamento em memória e a última montagem confirmada bloqueava todo o salvamento automático, disparava “HANGAR NAO SALVO” e solicitava nova leitura do servidor, mesmo sem edição explícita do hangar. A diferença exata no navegador do jogador ainda não foi capturada.

O checkpoint passivo agora transporta a montagem confirmada junto com seu estoque livre correspondente, preservando o progresso normal. Isso evita enviar uma desmontagem incidental como intenção do jogador. Configurações, nave, drones e equipamentos AUX usam o mesmo estado consolidado. Dano de escudo por configuração e dados de combate permanecem preservados. Edições explícitas de hangar continuam com intenção e confirmação próprias. O ACK não reaplica a diferença incidental.

Reenvios conservam o identificador, a fotografia e a intenção originais, mesmo se o jogador fizer outra edição depois da falha. O cliente também captura revisão/token antes de aguardar a gravação local da seleção de formação, evitando combinar uma fotografia antiga com uma revisão obtida durante essa espera. Se a gravação local falhar, não ocorre envio nem confirmação fictícia.

O guard de equipamento e as validações econômicas do servidor permanecem ativos. Não foi acrescentado SQL, polling, endpoint, fonte independente de saldo ou fluxo de gravação concorrente. O caminho corrigido usa o PUT já existente e evita o GET de recuperação provocado apenas por diferença passiva.

## Instalação e reversão

1. Faça backup do código atual e preserve os dados locais do navegador. Não limpe armazenamento/cache de dados enquanto houver pendências.
2. Coloque o ZIP na raiz do repositório existente e execute `python3 scripts/stellar-universal-installer.py Stellar_Legacy_V146_5_CUMULATIVA.zip`, ou aplique seu fluxo de atualização já usado pelo projeto.
3. Confira `npm run verify` e a versão 47.8.5. Revise as mudanças e faça o deploy pelo fluxo habitual, somente quando desejar.
4. Após publicar, recarregue a página para carregar os arquivos versionados. Verifique o save durante combate, saída/retorno e edição de CONF1/CONF2; valide novamente após relogar.
5. Para reversão, restaure o backup do código ou o commit anterior. Não há migração SQL a reverter nesta atualização. Não remova filas ou recibos persistentes.

Nenhum deploy ou alteração de produção foi realizado nesta entrega.

## Testes e limites

Os logs anexos registram o resultado completo de `npm run verify` e `npm run apk:check`. Há testes do remetente real de checkpoint com montagem incidental, preservação de progresso e escudo, edições rápidas durante ACK, resposta perdida, reenvio imutável e isolamento de conta/reset. A API real é exercitada com revisão alterada durante a gravação local e falha de disco. Os testes anteriores de economia e idempotência também são executados.

A auditoria de assets Android é estrutural; não representa compilação nem teste em aparelho. O fluxo autenticado no navegador do jogador e sua conexão real ainda precisam ser validados após implantação. Não há medição de latência ou tráfego de produção antes/depois desta correção; o benefício demonstrado é a remoção do bloqueio/GET no cenário automatizado reproduzido.

A inspeção somente de leitura também encontrou cancelamentos de consultas no período observado. Isso pode indicar timeout ou cancelamento pelo cliente e não comprova a causa deste aviso. Os logs do Render não estavam disponíveis por falta de workspace selecionado. Nenhum dado bruto de jogador é incluído na entrega. Esta atualização não declara concluída toda a migração offline dos demais módulos.

## Resultado desta execução

- `npm run verify`: 327 testes, 326 aprovados, zero falhas e um teste ignorado por ausência de JDK no ambiente.
- `npm run apk:check`: 1.365 arquivos locais, 1.103 imagens, 43 naves e 40 NPCs auditados.
- Cenário automatizado corrigido: uma tentativa de PUT para salvar o progresso, zero GET de recuperação e nenhum aviso falso de hangar. Não é um benchmark de produção.
- Instalador aplicado em cópia V146.4: todos os 145 arquivos do primeiro pacote conferidos byte a byte; auditoria de 182 módulos/234 caminhos sem dependências ausentes.
