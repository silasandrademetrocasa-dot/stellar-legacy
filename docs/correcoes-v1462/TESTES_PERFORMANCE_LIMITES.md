# Testes, comparação e limitações

## Resultado executado

- `npm run verify`: 309 testes, 308 aprovados, zero falhas, um ignorado por ausência do JDK. Inclui sintaxe, imports, versões e assets.
- `npm run apk:check`: passou. Inventário de 1.362 arquivos locais/1.103 imagens, cerca de 119,14 MiB; 43 naves, 40 NPCs e referências de arte conferidas. É auditoria estrutural, não compilação nem execução no Android.
- 15 cenários novos cobrem os 72 slots, direção inicial, órbita Original, profundidade por raridade, ACK com combate continuamente alterando o save, ACK anterior à revisão necessária, 100 cliques duplicados, tier ainda não enviado, resposta perdida, recusa, mudança de sessão, progresso do passe, DOM do Natal instalação real de estado econômico e concessão de nave pelo servidor durante uma montagem pendente.
- PostgreSQL embarcado executou as funções reais de nível/Free/Premium e missão de Natal, repetindo resgates, conferindo marcadores, saldo e backup A. O adaptador real da Fronteira foi executado em VM com falha de leitura após crédito e recuperação de ALREADY_CLAIMED.
- A regressão cumulativa manteve os testes existentes de 100 compras, 500 coletas, 1.000 NPCs, lotes repetidos, conflito entre dispositivos, queda após gravação/processamento, A/B/C, hangar e CONF. Não são 1.000 NPCs renderizados num Android.

A primeira rodada completa encontrou três falhas de compatibilidade da verificação: o teste de bootstrap limitava a leitura aos primeiros 250 caracteres, e o harness do hangar precisava carregar a nova dependência e reconhecer a revisão retornada. A importação foi movida para depois da espera do bootstrap, o harness recebeu a função real e as duas rodadas focadas/rodada completa final passaram. Os logs finais estão nesta pasta; não se está apresentando a primeira rodada como aprovada.

## Comparação sustentada pelo código e pelos testes

| Situação | V146.1 | V146.2 |
|---|---|---|
| Oito drones especiais | Quatro âncoras replicadas com deslocamento | Oito âncoras numeradas por formação; 72 posições |
| Direção da primeira amostra | Começava em ângulo zero e convergia | Já começa na direção da nave |
| Resgate já elegível no banco | Podia esperar ciclo de até seis tentativas de save e cancelar por nova alteração | Um comando autoritativo, sem PUT prévio de progresso por causa do clique |
| Tier que existe apenas localmente | Espera global podia cancelar mesmo com um snapshot já aceito | Recusa NOT_READY, checkpoint da revisão necessária e nova consulta do mesmo resgate |
| 100 cliques rápidos iguais | Algumas telas só tinham guardas próprias; pré-save ainda podia bloquear | Um envio/uma instalação no teste do executor; não se criou compra em lote de prêmios |
| Natal após ACK | Dependia do GET de status e podia aceitar resposta anterior | Marca confirmada imediatamente; status atrasado não apaga |
| Compra/coleta chegando junto de diária do passe | Estado remoto podia substituir progresso local ainda não enviado | Objetivo provisório preservado, com marcações de resgate oficiais |
| Saldo de guerra/Elite | Copiado parcialmente para o cliente | Instalador central e projeções pendentes preservados |

Não há medição nova de FPS, ms por clique, consumo de dados móveis ou carga real do Render. Não se atribui percentual de redução a um teste simulado. A mudança elimina pré-saves desnecessários nesses caminhos; o comando de recompensa e sua validação no banco continuam existindo. Um tier ainda não confirmado pode precisar de mais de uma tentativa de checkpoint em conflito e continuará pendente enquanto a economia anterior não permitir enviar um snapshot seguro.

## Pendências e riscos que permanecem

1. Testar APK real no aparelho modesto e com duas contas, incluindo todos os resgates coletivos/pesquisa/designers. DOM e PostgreSQL de teste não substituem isso.
2. Fazer o deploy desta versão e gerar APK. Nenhum desses passos foi executado nesta entrega; não foi mudado banco de produção.
3. A migração local-first original ainda não está completa. Jornada, fallback local de eventos e outros escritores indicados nos relatórios anteriores precisam de concessão autoritativa própria. Não se declarou a economia integralmente migrada.
4. O novo executor não cria uma fila econômica paralela para tarefas. Os recibos finais são duráveis no servidor; uma tarefa não confirmada continua disponível para nova solicitação após reabrir/reconectar. As três tentativas automáticas pertencem à sessão atual e não prometem envio automático de um clique ainda não confirmado após encerrar o processo.
5. Objetivos do passe preservados no aparelho continuam sujeitos à validação do checkpoint. Não são autorização para fabricar pontos, moedas ou resgates. Não houve reconstrução de progresso histórico que já tinha sido perdido antes desta versão.
6. Trocas entre temporadas, encerramento do Natal, Premium expirado, falta de elegibilidade e farm offline ativo continuam podendo impedir resgate legitimamente.
7. A distância visual do diagrama é uma referência proporcional dos desenhos, não uma medição de pixels do print. Bobs, projeção 3D e separação de sprites deslocam levemente a posição durante a animação, por exigência de preservar os movimentos.
