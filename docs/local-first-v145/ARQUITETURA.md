# Alterações arquiteturais V145.0

## Uma autoridade financeira e um escritor remoto

`progress` continua sendo o estado de execução da aplicação. O coordenador V106 continua sendo o único escritor HTTP de checkpoints. IndexedDB V121 continua sendo o journal local, e o espelho legado de localStorage permanece para os módulos que ainda o leem. Os logs por módulo do servidor não viram fontes independentes de saldo.

O adaptador V145 modifica a representação do checkpoint em trânsito. O estado econômico definitivo continua sendo o save consolidado protegido por `stellar_player_commit` e pelos validadores existentes. A atualização não aceita um saldo absoluto local como autorização para compra ou recompensa e também não substitui todas as regras legadas de checkpoint por um ledger econômico novo. O modelo de segurança herdado ainda precisa de auditoria adicional antes da migração econômica completa.

| Etapa | Responsável | Comportamento |
|---|---|---|
| Mutação normal já local | `game.js` | `saveGame()` prepara journal e notifica o orquestrador |
| Persistência local | `local-first-bridge-v1211.js` | Consolida staging e usa a transação IndexedDB existente |
| Recuperação | `local-first-save-v121.js` | Verifica SHA-256 do primário, A, B, C; o remoto continua validando economia |
| Janela de envio | `local-first-sync-v122.js` | Timeout único de 4s, aviso por mutação, single flight, backoff 5–60s |
| Serialização HTTP | `state-delta-v145.js` | Envia alterações somente quando menores que 80% do payload completo |
| Reconstrução Render | `save-delta-v145.js` | Resolve base da mesma conta/sessão, limita operações/tamanho, reconstrói antes dos validadores |
| Commit definitivo | Rotas e SQL existentes | Guardas de reset, dono, equipamentos, missões, saldo e recibos permanecem |
| Resposta | Adaptador + API cliente | Delta relativo ao estado enviado ou snapshot; o cliente reconstrói antes de instalar |

## Referências do delta

Uma resposta autenticada de GET/PUT save pode incluir `delta_base_v145`, SHA-256 da representação JSON armazenada pelo adaptador. O cliente mantém uma cópia imutável dessa referência somente na sessão atual. A requisição delta contém `delta_v145: {base, changes}` junto aos mesmos metadados de operação/revisão/token usados pelo save anterior.

O Render não consulta SQL para procurar essa referência: usa um cache de transporte de até 128 entradas / 16 MiB, com validade de cinco minutos e limite de 1 MiB por estado. Evicção, reinício ou outra instância do Render podem produzir `DELTA_BASE_MISSING`. O servidor recusa esse pedido antes de executar o commit. O cliente então repete o snapshot integral e o MESMO operation_id, sem inventar um novo comando.

O hash é uma referência de transporte, não assinatura antifraude. As operações de patch não permitem `__proto__`, `constructor`, `prototype`, caminhos inexistentes ou alteração por índice de array. Arrays são substituídos inteiros. Um delta reconstruído não pode exceder 1 MiB. A autoridade financeira continua nas validações/recibos existentes.

## Journal

Não foi criada uma segunda base nem alterada a versão do banco IndexedDB. Cada commit continua atualizando snapshot, checkpoints e intenção dentro da mesma transação. `sequence` é a revisão local do commit que criou o evento; ela pode conter lacunas e não é uma sequência global de eventos econômicos no Supabase. O processamento repetido de uma mesma intenção local não cria outra entrada; reutilizar o ID com outro conteúdo aborta a transação.

Uma falha de hash no primário permite leitura de A/B/C com verificação. Recuperar uma cópia local não a transforma em dinheiro confirmado e não elimina a fila pendente. Não se promete recuperação caso todas as cópias estejam corrompidas, o armazenamento seja apagado ou nenhuma transação tenha sido confirmada pelo sistema operacional.

## Cache de configurações

Allowlist: topbar, npcs, world, systems, pass, shops, bonus, gates e balance. Chave inclui dono/sessão; logout e troca de sessão limpam o cache. Leituras simultâneas compartilham a requisição, mas recebem objetos clonados. Falhas não são memorizadas. `refresh=1` ignora validade; um fetch em voo ainda pode ser compartilhado. Respostas de uma geração de sessão antiga não repovoam o cache limpo.

Os timers legados que pedem essas configurações ainda existem e passam a encontrar o cache. Não há invalidação push nova; alterações administrativas podem levar aproximadamente cinco minutos, mais a próxima consulta do consumidor, para aparecer. O servidor valida operações pelo catálogo efetivo.

## Compatibilidade e limites

Clientes antigos continuam enviando snapshots integrais. Cliente V145 em servidor antigo envia snapshot inicialmente e só usa delta se o servidor negociar uma referência. O esquema SQL não muda. O transporte otimiza rede cliente/Render; o JSON persistido e o caminho Render/Supabase continuam integrais por commit. Um novo ledger em lote para economia e as projeções otimistas ainda precisam ser implementados e testados separadamente.
