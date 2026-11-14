# Arquitetura V146

## Autoridade e gravação

`game_saves` continua sendo o estado econômico definitivo. Os triggers existentes atualizam a projeção de perfil e os backups SQL A/B/C. As tabelas novas registram recibos e cursores; não guardam um saldo paralelo.

No dispositivo, `stellar-legacy-local-v121` sobe para schema 2, preservando `saves`, `checkpoints` e `outbox`. Um pequeno store de metadados aloca UUID do dispositivo e sequência densa, por jogador. Append de evento, avanço da sequência e snapshot provisório são uma transação IndexedDB. O checksum é SHA-256; A/B/C e recuperação existentes foram mantidos. Um índice composto jogador/status evita varrer todos os recibos terminados a cada append. A/B/C são recuperação do snapshot, não substituem nem apagam eventos pendentes.

`economic-manager-v146.js` coordena envio e projeção; `economy-projector-v146.js` aplica apenas a prévia local. O escritor remoto de checkpoints existente não ganha um concorrente. Checkpoints aguardam a confirmação das projeções financeiras; alterações de combate, missão e montagem continuam registradas localmente.

## Protocolo

Evento: UUID, dispositivo UUID, sequência, reset epoch, tipo, argumentos e cotação esperada. A prévia visual não é enviada como autorização. O servidor autentica a conta/sessão, valida o envelope e calcula hash dos argumentos. Lotes têm no máximo 40 eventos de um dispositivo e 150 mil caracteres JSON. Tipos ativos: catálogo, bulk, AUTO BUY, venda de porão/inventário e coleta.

`AsyncLocalStorage` associa somente os commits da operação corrente ao evento. Outros jogadores, NPCs e chamadas fora desse escopo continuam com seus próprios comandos. Os handlers de negócio existentes validam preço, posse, estoque, saldo, CPU, base, reserva de leilão e demais requisitos. Não se aceita o saldo absoluto do cliente.

`stellar_localfirst_commit_v146` chama o núcleo `stellar_player_commit` sob o lock do jogador. O commit econômico e o recibo/cursor do evento são atômicos na mesma transação PostgreSQL. Preço/moeda divergentes ou reset administrativo recusam o evento antes do débito. Um recibo terminal consome a sequência; um erro transitório conserva o evento e seus sucessores para tentativa posterior.

`serverEconomicAckV146` acompanha os snapshots autoritativos. Se o servidor confirmou uma compra, mas a resposta HTTP se perdeu, uma atualização de combate que já contém esse cursor não projeta a compra novamente. O trigger novo impede checkpoints comuns de inventar, apagar ou regredir o cursor. Apenas as funções privadas do servidor podem avançá-lo.

O cliente instala o estado canônico, reaplica os eventos ainda não confirmados e conserva journals locais de consumo/montagem/missões. Recibos e snapshot reconciliado são gravados juntos em IndexedDB. Falha nessa gravação conserva os eventos para replay; efeitos locais auxiliares usam marcador por ID. Recusas removem o efeito provisório correspondente, sem copiar um saldo remoto antigo sobre outro mais recente. Montagem alterada por outra sessão continua sendo um conflito explícito pelo mecanismo existente.

## Conectividade

Janela acionada por alteração: quatro segundos; AUTO BUY e eventos de navegação/segundo plano podem antecipar envio. Sem fila, não existe timer HTTP desta fila. Falhas aplicam backoff até 60 segundos; reconexão tenta antecipar a retomada. Respostas parciais removem somente IDs terminais válidos. Perda de resposta não é recusa. A consulta de saldo nunca é cacheada para autorizar uma operação.

Web Locks evitam dois workers simultâneos no mesmo navegador; uma disputa de lock reagenda a tentativa, sem abandonar o timer. Duas conexões IndexedDB compartilham a sequência transacional. Se outra aba já drenou a fila, faz-se uma leitura canônica de recuperação, orientada por esse evento; falha nessa leitura mantém o bloqueio de checkpoint até recuperar. Isso não é uma promessa de mesclar arbitrariamente duas montagens offline: a economia é serializada e conflitos de posse/layout são reconciliados ou recusados.

Troca de conta, encerramento de sessão e sessão substituída param o gerenciador. O transporte verifica proprietário/sessão; uma resposta tardia não instala a conta anterior. A fila daquele proprietário permanece persistida.

## BOX e segurança

Remoção visual ocorre antes de qualquer consulta remota. O servidor emite HMAC sobre jogador, drop, coletor, posição observada e horário; a prova não contém chaves privadas. Emissão tem limite por conexão e não consulta banco. O batch valida assinatura e o handler de coleta verifica existência do drop, alcance, AUX/gear, capacidade e recibos. A prova preserva a posição de chegada durante a janela de lote, mas não estende a validade do loot. A recompensa econômica continua sendo calculada e concedida pelo servidor uma única vez.

## Limite desta etapa

O lote ainda executa validadores/commits por evento e devolve um único snapshot consolidado ao dispositivo. Não foi implementado um interpretador SQL único para todos os módulos do jogo. Não houve alteração no balanceamento, nos assets ou na identidade visual. A lista de módulos ainda autoritativos está no LEIA_PRIMEIRO.
