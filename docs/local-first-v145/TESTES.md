# Testes e evidências

## Antes / depois

| Validação | Resultado |
|---|---|
| Base enviada: `npm test` | 239 contabilizados, 238 passaram, 0 falhas, 1 ignorado |
| Versão final: `npm test` | 257 contabilizados, 256 passaram, 0 falhas, 1 ignorado |
| `npm run check` | Sintaxe, imports, versões, assets e grafo de módulos; log anexado |
| `npm run apk:check` | Passou: 1.355 arquivos públicos, 1.103 imagens, 43 naves e 40 NPCs nas verificações existentes |
| SQL V145 preflight/rollback | Executados contra PostgreSQL/PGlite de teste, sem alterações de esquema |
| Teste em Chromium | Tentado; bloqueado por restrição a socket Unix neste ambiente |
| APK real / Moto E7 | Pendente; não gerado nem instalado neste ambiente |

O teste ignorado é a compilação da política nativa Java por ausência de JDK. A verificação estrutural de assets não equivale à geração de um APK assinado nem à execução no Android.

## Novas verificações

- `v145-local-first.test.mjs`: roundtrip de delta, deleção/arrays/null/Unicode, rejeição de prototype pollution/caminhos inválidos, limite de operações, seleção de payload, referências por conta/sessão, evicção e expiração, cache imutável, invalidação e falhas, agendamento sem polling ocioso, mutações em voo e backoff.
- `v145-api-delta.test.mjs`: API cliente real com transporte mockado; negociação, referência perdida, reenvio do mesmo ID/token e reconstrução da resposta. O validador existente continua recusando revisão de compra adulterada.
- `v145-journal.test.mjs`: transações com fake-indexeddb, duplicação de intenção, ID reutilizado, aborto atômico, pendência de hangar preservada, A/B/C corrompidos, reabertura e duas conexões com 100 revisões serializadas.
- `v145-stress.test.mjs`: PostgreSQL/PGlite, funções transacionais reais do fixture; 100 intenções econômicas de compra de suprimentos e 100 replays, 500 coletas de loot e 500 replays, 1.000 recompensas de NPC e 1.000 entregas duplicadas. Saldos finais, munição, porão, remoção de drops e backup A são conferidos.

Os cenários de compra/loot no stress chamam a camada SQL sob a confiança do servidor e não a UI/validação completa da rota HTTP de compra. As 500 coletas são loot persistido, não sorteios de BOX bônus; preço e cotação de suprimento são definidos pelo fixture. Não foram apresentados como testes completos de interação do jogador.

## Cobertura herdada preservada

A suíte anterior verifica missão/recompensa exatamente uma vez, conflitos de snapshot, montagem do hangar, CONF, formações, resgates de farm, leilão e permissões de service_role. Isso fornece regressão automatizada do código/fixtures já existentes. Não prova que toda configuração do Supabase de produção coincide com os fixtures.

## Matriz de conectividade e integridade

| Pedido | Evidência executada | Limite / pendência |
|---|---|---|
| Rede lenta e alta latência | Promise atrasada na API e alterações durante escrita | Sem medição de rede Android |
| Perda e reconexão | Erros/offline/backoff e retomada no orquestrador | Reconexão durante combate real pendente |
| Fechar/reabrir | Fechamento/reabertura de conexão IndexedDB, fila preservada | Não é encerramento forçado do processo Android |
| Reiniciar dispositivo | Nenhuma execução física | Pendente |
| Duas sessões | Isolamento da referência, regressão de sessão e 100 commits locais concorrentes | Não implementa merge econômico global entre dois aparelhos |
| Reenvio do mesmo lote | Não existe novo protocolo batch econômico | Pendente; replays de comandos individuais testados |
| Gravar local antes da confirmação | Intent atômico, reabertura, ACK seletivo | Não cobre fila econômica nova, que não foi implementada |
| Servidor processa e resposta se perde | Replays SQL retornam recibo sem duplicar | Sem queda real de rede contra produção |
| Dinheiro/item/recompensa duplicados | Asserções de saldos, estoque, porão, recibos; regressões de missão | Não é certificação antifraude completa |
| Farm offline/relógio | Guardas e testes herdados preservados | Não foi feita nova implementação nem ensaio real de mudança de relógio Android |

Logs finais: `testes.log`, `check.log`, `apk-check.log`. O microbenchmark é independente da suíte. O script opcional `scripts/test-local-first-browser-v145.mjs` foi incluído para um host compatível com Chromium, mas **não passou neste ambiente**. Nenhum deploy ou alteração de produção foi necessário para estes testes.
