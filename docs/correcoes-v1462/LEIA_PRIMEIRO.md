# Stellar Legacy Mobile — V146.2 / 47.8.2

Cumulativa de correções sobre V146.1. O ZIP inclui os fontes novos/alterados desde a base original V144.1 (47.7.80), inclusive V145/V146/V146.1. As artes existentes ficam no projeto; não estão repetidas no ZIP de atualização. Não é uma instalação vazia nem um APK compilado.

## Instalar e testar

1. Guarde uma cópia do projeto atual e mantenha a mesma assinatura Android.
2. Suba `Stellar_Legacy_V146_2_CUMULATIVA.zip` na raiz e aplique pelo Instalador Universal existente. Não extraia em uma subpasta dentro de `public`.
3. Faça o deploy do cliente/servidor desta versão no Render pelo processo já usado. O servidor passou a distinguir progresso ainda não recebido de uma recusa definitiva. Atualizar somente o APK deixa essa recuperação incompleta.
4. Gere o APK pelo workflow existente e instale como atualização, sem desinstalar nem limpar os dados.
5. Confira `/health` e a versão 47.8.2. Não reaplique migrações antigas: **esta correção não exige SQL novo**. Ela pressupõe o SQL V146 já aplicado. Os SQLs anteriores presentes na cumulativa são históricos, não uma instrução para executá-los de novo.

Nenhum deploy, concessão de recompensa em conta real ou alteração de produção foi feito nesta entrega. A consulta de configuração em produção foi somente leitura.

## Formações conforme os desenhos

Foram substituídas as quatro posições reaproveitadas por oito posições explícitas, numeradas D1–D8, em todas as nove formações. Veja `FORMACOES_D1_D8.png` e `POSICOES_D1_D8.json`. No JSON, cada par é `[frente, direita]` em coordenadas locais da nave; a ordem é a numeração do desenho, não a ordem de profundidade do render.

- Original: quatro drones atrás da nave e dois em cada flanco, conforme o desenho. O conjunto continua orbitando a 25°/s; o desenho representa a fase inicial ao selecionar a formação.
- Fúria, Interceptor, Bastião e Colosso mantêm seus movimentos no plano.
- Vanguarda, Prisma, Caçador Supremo e Leviatã mantêm profundidade, escala e deslocamentos existentes. Sombras continuam desativadas na qualidade baixa.
- A primeira amostra já considera a direção da nave. Permanecem a suavização de direção e a transição de 0,75 s sem teleporte, inclusive durante trocas rápidas.
- O mesmo motor atende drones locais e remotos. Até oito drones ocupam seus lugares numerados; quantidades adicionais têm extensão defensiva, sem inventar posse.

Não foram alterados bônus, raridades, preços, consumo de munição, artes ou os slots independentes da CONF1/CONF2. Os 1.101 arquivos de imagem da base original sob `public/assets` foram conferidos byte a byte e permanecem idênticos.

## Resgates e progresso

O bloqueio comum era exigir que `cloudDirty` ficasse falso após o ciclo inteiro de salvamento. Combate, abates e autopilot podem gerar alterações durante cada envio. Isso cancelava resgates mesmo quando a elegibilidade já estava confirmada no servidor.

Agora os resgates com identidade idempotente consultam diretamente o comando autoritativo. Quando nível/tier ainda não chegou ao servidor, o cliente pede um checkpoint pelo **mesmo escritor existente** e espera o ACK da revisão necessária, sem exigir que toda a jogabilidade fique sem alterações. Mudanças posteriores permanecem pendentes. Um ACK de snapshot anterior não libera o novo checkpoint.

Cliques repetidos na mesma tarefa compartilham a operação em andamento; falhas transitórias recebem até três tentativas com pausa crescente. O recibo continua sendo do servidor. Conta, geração de login e reset cercam respostas atrasadas. A recompensa não é criada localmente e uma recusa não marca concluído.

O botão de nível/passe mostra CONFIRMANDO durante o pedido. RESGATADO depende do estado retornado. O resgate em sequência para no primeiro erro, em vez de repetir o mesmo bloqueio por todos os tiers. Não se criou outro saldo, outro banco local ou outro salvamento concorrente. Quando um prêmio acrescenta uma nave sem equipá-la, a montagem legítima ainda pendente é preservada. Essa reconciliação aceita somente a posse acrescida pelo estado autoritativo; não aceita posse inventada no cliente, remoção de naves ou alteração de montagem por outra sessão.

O instalador econômico também preserva objetivos/pontos locais ainda não enviados do passe ao receber um recibo de compra/coleta. Essa preservação é provisória e respeita conta, reset e temporada. As marcações de recompensas resgatadas vêm exclusivamente do estado autoritativo. Isso evita apagar uma missão diária concluída enquanto outra ação está sincronizando.

No Natal, a confirmação já atualiza o botão, sem depender de um segundo GET para marcar RESGATADO. Consultas iniciadas antes do resgate não apagam essa marcação. A atualização de status em andamento é aguardada e uma consulta nova é feita depois; respostas de outra conta são descartadas. Atualizações de designers deixam de atrasar recompensas de moedas. A compra de designer conserva seu preflight econômico.

## Banco e rollback

Não há migração SQL V146.2, tabela nova ou remoção de função. Mantêm-se os recibos/locks, núcleo de transações e A/B/C existentes. Para voltar o código, restaure o backup V146.1 no Render e gere o APK anterior com a mesma assinatura. Não apague saves, outbox ou recibos. Não execute rollback SQL V146 para reverter somente esta correção. Eventos já confirmados continuam legítimos no banco.

## Validação no aparelho

Teste as nove formações parado e virando a nave, com oito drones, alternando CONF1/CONF2 e vendo outra conta no mapa. Compare a disposição inicial com o diagrama e observe a órbita da Original.

Durante combate/autopilot, resgate nível, Free/Premium e uma missão natalina elegível. Feche/reabra o painel, reconecte e confirme saldo/inventário e RESGATADO. Repita com latência e resposta perdida. Os designs Cristal/Vulcão do passe de dezembro continuam sujeitos à temporada e aos tiers próprios; novembro não libera esses prêmios.

Os testes automatizados passaram, mas ainda falta executar estes fluxos no Android real. Não houve compilação/assinatura de APK neste ambiente.
