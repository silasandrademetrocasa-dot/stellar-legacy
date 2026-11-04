# STELLAR LEGACY — V119.2 CUMULATIVA DE ESTABILIZAÇÃO

## Escopo validado em código

Este ZIP combina as migrações V119.0 e V119.1 com melhorias V119.2, para ser instalado **UMA** vez pelo Instalador Universal. Base: projeto completo 47.7.60 enviado pelo piloto. Não inclui imagens, APKs nem SQL que paga prêmio.

1. `game_saves` continua o **único estado oficial** de créditos, STL, inventário e progresso. `profiles` continua projeção, não vira outra carteira.
2. Save V119.0 prepara revisão, comandos idempotentes, recibos, backups A/B/C e logs de mudanças. O modo seguro continua `observe`; não ativar `enforce` sem converter todas as RPCs antigas.
3. V119.1 inclui captura **adaptativa** e visão de auditoria de NPC, minério, leilão, Farm e save, sem pagar/alterar nada na view. Captura GLOBAL fica desligada por padrão.
4. V119.2 mede latência/falhas de escrita nos RPCs de save, Hangar, economia, leilão e Farm. Monitor armazena apenas categoria, duração e sucesso; nunca jogador, inventário, saldo, payload ou token.
5. V119.2 acrescenta GET autenticado `/api/save/core/health`. Inspeciona somente a conta do solicitante: saldo x perfil, hash da revisão, IDs de drones e slots órfãos da CONF1/CONF2, slots A/B/C e situação do Farm. Não restaura nem altera nada.
6. V119.2 exibe avisos longos do Android em várias linhas e por tempo suficiente para leitura. Sem barra atravessando todo o HUD.
7. V119.1 inicia leituras de `reset_epoch` e save simultaneamente e mantém P95/P99 do carregamento.

## Instalação por ÚNICO ZIP

1. Subir somente `STELLAR_LEGACY_V119_2_CUMULATIVA_SAVE_E_DIAGNOSTICO.zip` na raiz do GitHub (retirar os outros ZIPs da raiz, para o instalador reconhecer exatamente um).
2. Executar **Actions > Instalador Universal > instalar**, aguardar a validação automática e o Render publicar o commit.
3. No Render, deixar `STELLAR_SAVE_V119_MODE=observe` (ou não configurar essa variável). **Não usar `enforce`** nesta fase.
4. Em Supabase, a V119.0 já foi preparada; V119.1 recebeu somente o metadado adaptativo e a view de logs na rodada anterior. Os SQLs do ZIP estão disponíveis para ambiente de homologação, caso não existam, mas não é preciso executá-los novamente em produção para usar este patch de código.
5. Consultar `/api/save/core/health` **com sessão autenticada** para validar os dados atuais de cada piloto, e `/api/save/core/status` para observar latências.
6. Testar uma compra pequena, equipar e trocar CONF1/CONF2, missões, leilão, e Farm com virada do dia. Confirmar A/B/C e revisões antes de qualquer corte.

## O que NÃO está resolvido neste pacote

- RPCs legadas de NPC, minério, missões, PvP, clãs e Farm ainda não foram inteiramente convertidas para um único **escritor** transacional. Nenhum ZIP pode simular uma homologação real dessas operações; a migração exclusiva depende de testes de concorrência no banco e comportamento em duas contas.
- Um bom resultado dos testes automatizados de Node **não** comprova a integridade de Farms de 8 horas nem latência real Android.
- A captura por trigger pode sobrecarregar o Supabase em carga alta; não ativá-la em produção sem ensaio. Scripts `CAPTURA_ATIVAR` e `CAPTURA_DESATIVAR` são complementares e manuais.
- A V118.0 continua sendo o commit econômico usado pelo Render em `observe`. Não foram desligadas as proteções SQL de antifraude ou recompensas.

## SQLs inclusos — ordem apenas em HOMOLOGAÇÃO

- `sql/STELLAR_V119_0_SAVE_UNICO_PREPARAR.sql`: criação inicial do núcleo (já executada em produção).
- `sql/STELLAR_V119_1_CAPTURA_ADAPTATIVA_PREPARAR.sql`: atualizar a **função** (não o gatilho) para versão adaptativa.
- `sql/STELLAR_V119_1_LOGS_SOMENTE_LEITURA.sql`: disponibilizar view privada.
- `sql/STELLAR_V119_1_CAPTURA_ATIVAR.sql`: capturar alterações antigas, reconciliar metadados divergentes e ligar trigger (somente após teste de carga).
- `sql/STELLAR_V119_1_CONFERIR.sql`: conferir resultados.
- `sql/STELLAR_V119_1_CAPTURA_DESATIVAR.sql`: desativar captura em caso de degradação, sem apagar progressos.

**Atenção:** não restaurar snapshots A/B/C automaticamente. Eles só são válidos para recuperação após reconciliar os recibos de recompensas, leilão e compra. Nunca repita uma cobrança por falha de rede.
