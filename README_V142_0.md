# Stellar Legacy V142.0 — boxes natalinas e revisão de saves

Versão técnica 47.7.74. Atualização incremental sobre V141 / 47.7.73, pelo workflow universal habitual.

## Instalação

O SQL `sql/STELLAR_V142_BOX_NATAL_UNIFICADA.sql` já foi aplicado e verificado no Supabase do projeto em 11/11/2026. A cópia no ZIP registra a alteração e permite reproduzir os testes. Não é necessário executar novamente.

Suba o ZIP na raiz e execute o workflow existente. A mistura só é ativada nas chamadas do backend V142: a identificação interna acompanha o cliente administrativo do Render. As chamadas do backend V141 continuam com boxes normais enquanto o novo ZIP não for instalado. Nenhum endpoint novo de coleta foi criado.

## Boxes durante 24 horas

- Durante a temporada de Natal habilitada no banco, os pontos de box se dividem em 50% bônus e 50% Natal, independentemente do horário e do evento de NPCs ativo.
- X-1 a X-8: configuração atual de 20 pontos por mapa, sendo 10 de cada tipo. Vale nas três facções.
- PvP 4-1/4-2/4-3: configuração atual de 30 pontos, sendo 15 de cada tipo.
- Universo U-1/U-2/U-3: 20 pontos quando não houver quantidade configurada, sendo 10 de cada tipo.
- Mapas Astrais ficam excluídos, mesmo com configuração administrativa de quantidade maior que zero.
- Não acrescenta uma segunda população de caixas. Um ponto em recarga fica temporariamente indisponível; não é reposto antecipadamente por outra caixa.
- Quantidades ímpares reservam a parte inteira da metade ao Natal. A configuração geral de quantidade continua sendo utilizada; para mapas sem quantidade positiva, o Natal usa o padrão de 20 pontos.

## Recompensa e salvamento

A caixa natalina sorteia um item da mesma tabela das bônus e dobra a quantidade, mantendo o protocolo de rendimento do AUX. Os núcleos seguem a probabilidade já existente: 95% sem núcleo, 4% com um e 1% com dois. Os núcleos usam o campo oficial `pilotBio.logDisks`.

Ambos os tipos usam o mesmo ID pessoal de drop, validação de nave/AUX, captura da posição de chegada, fallback WebSocket/HTTP com o mesmo pedido e `stellar_player_commit`. Recompensa, consumo, reposição, contador de missão/facção/global e recibo são confirmados na mesma transação. Repetir um pedido confirmado devolve o recibo e o estado atual, sem conceder novamente. A recarga preserva o tipo do ponto.

O coletor natalino antigo ligado à sala/evento foi removido do cliente e do servidor. Os NPCs natalinos continuam limitados aos eventos existentes: esta alteração não cria NPCs comuns no PvP.

## Validação

688 testes automatizados passaram, incluindo execução real das funções SQL em PostgreSQL local de teste. Casos novos cobrem divisão/estabilidade dos pontos, Universo/PvP, bloqueio dos Astrais, preservação de recompensa de NPC durante a coleta, perda de resposta, reenvio, rollback de recompensa/contador e permissões das funções. Recursos locais do APK também foram auditados.

A auditoria em produção foi somente leitura sobre dados de jogadores. Não houve concessão de créditos, reset ou restauração de saves para testar. A migração altera funções; não faz atualização em massa das contas.

Detalhes e limites do check-up em `docs/v142/CHECKUP_SAVES.md`. Ainda falta o teste prolongado com dois jogadores e reconexão em aparelho real.
