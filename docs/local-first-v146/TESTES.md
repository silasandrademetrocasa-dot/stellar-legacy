# Testes e evidências V146.0

Ambiente: Node 24, fake-indexeddb e PostgreSQL embarcado PGlite com schema/funções de fixture do projeto. Os handlers de catálogo, bulk, AUTO BUY e vendas foram extraídos do servidor real para execução, usando apenas um adaptador de transporte para o PostgreSQL. A coleta de stress executa `createPlayerRewardsV134`, as regras de alcance e o commit real do fixture. Não se usaram contas reais nem se concederam recompensas de teste em produção.

## Resultado da suíte

`npm run verify`: **283 testes contabilizados, 282 passaram, zero falhas, um ignorado por falta de JDK**. Verificação estrutural: 329 arquivos JavaScript válidos, 176 módulos do cliente, 225 referências de import/script e zero caminhos ausentes. Logs anexados nesta pasta. Depois dos últimos ajustes de ciclo de vida/texto, também foi executada novamente a fatia de compras, hangar e fila V146.

`npm run apk:check`: passou; 1.359 arquivos locais, 1.103 imagens, 43 naves, 40 NPCs e referências visuais verificadas. É auditoria de empacotamento, não um teste do APK instalado.

## Casos novos executados

| Cenário | Evidência/resultado |
|---|---|
| 100 compras de catálogo consecutivas | Handlers reais + PostgreSQL; 3 batches HTTP, 100 itens e débito exato |
| Callback real da loja, 100 compras sem HTTP | Gravação IndexedDB + estoque/saldo local; nenhuma espera de servidor |
| 500 coletas persistentes | 13 batches, 500 recursos; replay de todos os batches mantém 500 |
| 1.000 NPCs simulados e reenvio de cada recompensa | Função SQL de recompensa existente, crédito uma única vez; cursores da nova fila preservados |
| Bulk/AUTO BUY/venda de equipamento/porão | Handlers reais; cotação, quantidade, débito/crédito e replay corretos |
| Cotação e estoque alterados | Operação recusada sem débito/crédito indevido; próxima sequência válida continua |
| Desconexão durante 100 compras | Sem HTTP durante as ações; fila persiste e reabertura reprojeta as 100 compras |
| Resposta perdida depois do commit remoto | Evento continua pendente; replay não duplica item/débito |
| Snapshot de combate chega antes do ACK econômico | Cursor evita reaplicar os 40 eventos já confirmados; restantes continuam projetados |
| Falha ao persistir ACK local | Recibo continua na fila, replay recupera uma única compra |
| Reabertura com fila pendente | Gerenciador reconstruído sobre a mesma base IndexedDB; estoque reaplicado uma vez |
| Duas conexões locais/duas sessões de envio | Sequência local densa, disputa de worker reagendada, estado canônico recuperado pela aba já drenada |
| Outro dispositivo da mesma conta | Sequência independente; lock econômico impede criação/overwrite arbitrário de saldo |
| ID reutilizado, sequência saltada, reset administrativo | Reuso divergente recusado, salto conserva pendência, epoch antigo não debita |
| Compra recusada com montagem pendente | Remove equipamento provisório; conserva equipamento legítimo e missão do cenário |
| Prova BOX | HMAC válido conserva posição observada; assinatura adulterada, outro jogador/drop e prova vencida recusados |
| Isolamento assíncrono | Commit concorrente de NPC/outro jogador não herda o ID da compra |
| Permissões SQL | `anon`/`authenticated` sem acesso aos recibos e às funções novas; cursor forjado é removido/preservado pelo trigger |
| Aplicação repetida e rollback SQL | Scripts executados no banco de teste; recibos/saves preservados, negociação passa para drain |
| Fila vazia | Nenhum timer de envio novo/polling HTTP econômico |

As suítes anteriores de conservação do hangar, CONF1/CONF2, formações, missão/recompensa, farm, sessões, A/B/C/checksum, backoff e sincronização continuam incluídas. A presença desses testes não significa que todos esses módulos tenham sido convertidos ao novo outbox.

## O que permanece pendente

- Navegador completo e APK Android: o Chromium do ambiente havia bloqueado a criação de socket Unix (`Operation not permitted`, `process_singleton_posix.cc`). Não houve homologação visual ou funcional real do novo fluxo no aparelho. O teste de navegador disponível da V145 não substitui a homologação V146.
- Reinício físico do Android, encerramento forçado do WebView, armazenamento cheio e atualização assinada do APK com fila real pendente.
- Latência/perda/troca Wi-Fi/4G reais durante combate/autopilot, uso de bateria, FPS e consumo de memória em Android modesto.
- Dois aparelhos físicos com a mesma conta, troca de sessão, expiração/renovação de token com batch em voo e disputa real de leilão/PvP.
- Farm offline/resgate com virada do dia e tentativa de manipular o relógio em staging. Os validadores anteriores foram preservados; não foi realizado um novo resgate de produção.
- 500 BOX aleatórias percorridas pelo Autopilot no mapa real: o stress novo é de 500 coletas de loot controladas. HMAC e regras de bônus têm testes, mas não se apresenta o fixture como uma sessão de gameplay.
- Migração integral dos módulos listados no LEIA_PRIMEIRO, carga e logs de produção, comparação global de tráfego SQL/HTTP/WebSocket.

## Performance reproduzível

`npm run benchmark:economy` executa 100 compras pelo handler anterior, depois mais 100 pela nova fila, em banco descartável, com 200 ms de latência HTTP artificial. O resultado em `PERFORMANCE.json` mede corpos JSON sem compressão, RPCs do trecho de negócio e tempo da ação local. Não é medição de Render/Android/rede móvel.

Na execução registrada: 100 → 3 HTTP; 200 → 200 RPCs de negócio; 89.471 → 50.480 bytes JSON; mediana visual 205,12 → 1,25 ms e p95 216,36 → 4,86 ms. O batch ainda faz um SELECT adicional de recibos por lote e o wrapper mantém recibos/cursores no SQL. Autenticação, guardas, TLS, cabeçalhos, compressão e tráfego do mundo não entram nessa conta. Não se conclui economia total de dados ou redução de CPU/SQL no Supabase.

Para coletas, contam-se também as 500 mensagens WS leves de prova, além dos 13 batches. O ganho pretendido é retirar snapshots completos/espera da interface de cada coleta, não afirmar que todo o tráfego se resume aos 13 HTTP.
