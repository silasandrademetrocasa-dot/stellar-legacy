# Stellar Legacy Mobile — V145.0 (47.7.81)

**Cumulativa testável, com migração local-first PARCIAL. Não é a conclusão das nove fases solicitadas.**

Base: ZIP `stellar-legacy-main.zip` enviado em 12/11/2026, versão 47.7.80 / V144.1. A aplicação foi alterada sobre essa base. Nenhuma arte foi substituída, nenhum balanceamento foi modificado e nenhum deploy ou acesso de escrita à produção foi executado.

## O que foi aplicado

- Delta de transporte no mesmo GET/PUT `/api/player/save`: referências isoladas por jogador/sessão; cache limitado no Render; reenvio integral com o mesmo operation_id se a referência desaparecer; resposta de save também pode usar delta.
- Os deltas são reconstruídos antes da normalização e das validações existentes. Não concedem autoridade financeira ao cliente. O Supabase continua recebendo o snapshot consolidado através da função transacional existente.
- Cache de configurações em memória, por sessão, validade de cinco minutos, cópias independentes para consumidores e atualização explícita com `refresh=1`. Não armazena saves, saldos, permissões, chat, ranking ou leilões.
- O orquestrador existente usa janela de quatro segundos acionada por alterações e backoff de falhas. Não há um segundo escritor HTTP. Continua existindo um detector LOCAL de alterações a cada sete segundos para módulos legados; ele não chama HTTP nem cria saves para um estado igual. Outros timers de configuração/multiplayer continuam no projeto.
- Seleções de munição, atalhos, desejo de formação e troca de CONF pelo HUD deixam de aguardar o flush de rede no callback. Os bônus/efeitos autoritativos da formação continuam seguindo o estado confirmado: não foi liberada uma formação sem confirmação econômica.
- Recuperação IndexedDB tenta primário e A/B/C com checksum. Eventos e snapshot continuam na mesma base existente. ID repetido com conteúdo diferente aborta a transação; uma intenção econômica não marca uma intenção de hangar como substituída.
- Falha de escrita local mantém o staging para tentativa futura, sem recursão infinita. Isso não torna gravável um dispositivo com armazenamento bloqueado/cheio; o espelho legado continua como compatibilidade.
- IDs de compra persistem em localStorage, migrando o identificador antigo de sessionStorage. Compra em lote reaproveita ID após perda de resposta/reabertura para a mesma cotação.

## O que NÃO foi concluído

**Compras, vendas, BOX, prêmios de missão, craft e farm ainda não foram convertidos integralmente para execução otimista com fila econômica persistente e envio em lote.** Os endpoints e seus validadores permanecem. O aplicativo ainda espera confirmação nesses fluxos. O Autopilot ainda depende da conclusão de suas compras/vendas autoritativas para receber estoque/saldo.

Não foi entregue uma nova fila econômica global com sequência por dispositivo e confirmação por lote, nem reconciliação de todas as transações de duas sessões offline. O journal existente possui sequência local, não um novo protocolo econômico global. Os testes de duas conexões IndexedDB provam serialização das revisões locais, não a resolução completa de edição concorrente do inventário por dois aparelhos.

A autenticação não passou a ser a única operação com validação de rede: os caminhos econômicos e multiplayer existentes mantêm as verificações atuais. Há polling/subscriptions/RPC antigos que foram inventariados, mas não removidos sem migração de seus consumidores. Portanto, esta versão reduz parte do tráfego e melhora persistência; **não atende ainda ao objetivo de todas as ações normais instantâneas e offline**.

## Resultados disponíveis

- Suíte final: **257 testes contabilizados, 256 passaram, zero falhas, um ignorado por ausência de JDK**.
- Stress em PostgreSQL/PGlite com as funções reais do fixture: 100 intenções de compra de suprimentos, 500 coletas de loot e 1.000 recompensas de NPC; repetição de todas as entregas para verificar idempotência. Não é um teste de 500 BOX aleatórias em gameplay nem teste do Render real.
- Testes novos de transporte, sessão, expiração da base, corrupção do journal, concorrência local, backoff e reenvio passaram.
- Verificação estrutural dos assets do APK passou. Não foi gerado/instalado APK Android.
- Chromium headless foi tentado e bloqueou ao criar socket Unix (`Operation not permitted`, `process_singleton_posix.cc`). `npm run test:browser` permanece disponível para ambiente compatível, sem alegação de aprovação.
- Microbenchmark sintético: 96,85% menos bytes no corpo de 1.000 saves com alterações pequenas, e 85% menos solicitações de configuração no cenário simulado. Não representa economia total de dados móveis nem FPS no aparelho.

Leia `ARQUITETURA.md`, `ROTAS.md`, `TESTES.md`, `PERFORMANCE.md`, `IMPLANTACAO_ROLLBACK.md` e `RISCOS_PENDENCIAS.md` antes de publicar.
