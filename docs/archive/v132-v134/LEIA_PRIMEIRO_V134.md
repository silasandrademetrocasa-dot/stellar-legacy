# V134 — Save único e rotas atuais

Versão técnica: 47.7.64. Base obrigatória: V133.3 / 47.7.63, exatamente a base do ZIP enviado nesta conversa.

## Instalação pelo mesmo workflow

1. Aplicar `sql/STELLAR_V134_SAVE_UNICO.sql` no Supabase ANTES de publicar o código. A aplicação dessa etapa deve ser confirmada no relatório de entrega; a presença do arquivo sozinha não significa que ele foi executado.
2. Subir somente este ZIP na raiz do GitHub e executar o instalador universal existente. Ele aplica a atualização por cima da V133.3. O pacote não repete os 82 MB de artes já instaladas e não as apaga.
3. Aguardar o Render publicar 47.7.64 e atualizar/reabrir o jogo para carregar o novo cliente. O workflow continua igual; `pretest` instala as dependências fixadas no lockfile se o checkout ainda não as tiver, para executar também os testes SQL.
4. Somente DEPOIS do deploy, aplicar `sql/STELLAR_V134_CUTOVER_ROTAS.sql`. Essa etapa fecha o DML direto do leilão e as entradas SQL históricas para usuários. Não executar antecipadamente, pois o cliente V133.3 ainda usa essas entradas.

O ZIP não executa SQL automaticamente. Não executar os scripts históricos em lote nem os arquivos de `tests/fixtures` no banco do jogo. As implementações SQL antigas que ainda são chamadas internamente foram preservadas: número de versão antigo não significa que a dependência possa ser apagada.

## O que foi alterado

- Regra comum de bloqueio por conta em 43 rotinas inventariadas, incluindo os escritores de save, recompensas, NPC, minério, cupons, Natal, Arena, clãs, mercado e início/resgate do farm. Operações com duas contas ordenam os bloqueios por UUID.
- Um validador de escrita em `game_saves` verifica formato, proprietário, valores monetários e relógio crescente. Um único trigger atualiza a projeção em profiles e os backups A/B/C para todos os escritores.
- `stellar_player_commit` é a entrada atual de checkpoint, economia, compra, resgate e coleta novos. Aplica diferenças validadas pelo servidor sobre o estado confirmado, preservando créditos e recursos que chegaram em paralelo. Divergências que não podem ser combinadas retornam conflito para releitura, sem gravar parcialmente.
- Comandos têm recibos duráveis. Repetir um ID não paga nem cobra novamente; o retorno traz o estado atual, inclusive ganhos posteriores ao comando original.
- NPC/minério e setores históricos continuam com suas regras e ledgers próprios, executados sob a mesma disciplina de concorrência e o mesmo validador/projeção de escrita. Isso não é uma reescrita de todas as regras de negócio em uma função gigante.
- Lances comuns e AUX passam pelo mesmo endpoint/RPC atual. O servidor verifica rodada, piso por minuto, catálogo, saldo e garantias. O navegador deixa de alterar o status de lances diretamente e de transformar uma confirmação inconclusiva em derrota.
- Loot de NPC online tem emissão e propriedade registradas no servidor. Coleta, cargo e recibo são confirmados juntos; o loot pode ser recuperado após reconexão dentro de sua validade. Caixas bônus passam a ter IDs, posição, sorteio e resgate no servidor, respeitando configuração e cooldown.
- Níveis e passe Free/Premium usam resgate no servidor com marcador e recibo. Cupons novos e antigos têm uma única entrada atual, com recuperação de resgate já confirmado.
- Consumo de munição/míssil ainda não confirmado fica num registro persistente por conta. O checkpoint confirma os disparos pelo ID; leitura posterior recupera os recibos após resposta perdida. Respostas antigas são recusadas pelo relógio geral do estado.
- Capacidade do porão considera nave, extras, Logística, AUX equipado e serviço ativo. Capacidade não é preço de venda; cada recurso é vendido pela quantidade e cotação confirmadas.
- Funções locais sem uso para conceder prêmio de leilão/passe e para gerar caixas bônus foram retiradas do fluxo. As rotas HTTP históricas de escrita retornam 410 e pedem atualização do cliente.

## Rotas HTTP atuais

| Operação | Rota |
|---|---|
| Ler / salvar checkpoint | GET / PUT `/api/player/save` |
| Ações econômicas, porão, refinaria e protocolos | POST `/api/player/economy` |
| Compra unitária / em lote | POST `/api/player/purchase` e `/api/player/purchase/bulk` |
| Lance / entrega do leilão | POST `/api/player/auction/bid` e `/api/player/auction/settle` |
| Missão | POST `/api/player/missions/claim` |
| Nível / passe | POST `/api/player/rewards/claim` |
| Caixas / loot | POST `/api/player/collections/ensure` e `/api/player/collections/claim` |
| Cupom | POST `/api/player/coupons/redeem` |
| Natal | GET `/api/player/natal` e POST `/api/player/natal/claim` |

`SQL_WRITER_COVERAGE.json` lista todas as rotinas protegidas. `RPC_CURRENT_ROUTES.json` relaciona nomes históricos aos atuais. As duas versões históricas de cupom convergem intencionalmente para um único dispatcher atual, preservando os cadastros existentes.

## Validação e limites

A suíte inclui PostgreSQL em PGlite com as definições reais das funções, tabelas e triggers exportadas para uma fixture sem dados de jogadores. Testa migração repetida, NPC entre leitura e venda/compra/passe, minério durante venda, overdraft, cupom repetido, leilão após resposta perdida, bloqueio de permissão e consumo de munição após fechar/reabrir. O teste de navegador valida inicialização e imports; não usa uma conta real.

Esses testes reproduzem intercalamentos de operações. Não são um teste de carga com várias conexões ao Supabase nem uma certificação de ausência de falhas em produção. O progresso legado de objetivos, XP e atividades locais ainda usa checkpoints; centralizar a segurança da escrita não transforma automaticamente todo objetivo em telemetria autoritativa do servidor. Os validadores existentes continuam ativos. Não houve mudança intencional nas porcentagens dos designers, preços ou balanceamento de combate.

Primeira validação no jogo: atacar NPC com auto-buy, coletar/vender porão com bônus, resgatar missão/passe/cupom durante combate, repetir após queda de conexão e atravessar a virada do leilão. Conferir recibos e estado após reabrir.

## Recuperação

`sql/recovery/V134_ROLLBACK.sql` é apenas para recuperação deliberada, junto da reinstalação da V133.3. Restaura implementações e entradas históricas; não apaga contas nem os recibos novos. Não executar como parte da instalação normal.
