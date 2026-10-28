# STELLAR LEGACY V91 — Correção de conflitos do Farm Offline

**Base:** V90 (47.7.46) → **V91:** 47.7.47.

## Diagnóstico a partir do print

- Dois episódios `conflict` (Apex Overlord no X-7): o SQL não entregou recompensas porque considerou a sessão incompatível com atividade online/alteração de save/perfil.
- Um episódio `settled` com 0 NPCs (Obsidian Pike): a sessão terminou, mas não simulou kills creditáveis com a configuração selecionada.
- Um histórico anterior `settled` em X-1 demonstrou recompensas reais; o sistema nem sempre falha.
- Não é possível determinar qual coluna disparou cada conflito passado sem acesso ao Supabase correto e/ou telemetria da época. Uma sessão `conflict` **não é garantia de recompensas devidas**.

## Correções V91

1. O cliente espera qualquer save em andamento terminar e exige confirmação antes de iniciar o Farm Offline.
2. O mundo e WebSocket são pausados **antes** do pedido de início SQL, e o cliente espera 350 ms por mensagens já enviadas. Em resposta incerta por timeout, consulta o estado oficial e não retoma o combate às cegas.
3. `joinSharedUniverse`, sincronização de presença, atualização remota, watchdogs, `visibilitychange`, salvamento local periódico e checkpoints evitam recriar atividade de jogo quando o farm está ativo.
4. No login, a consulta da sessão offline antecede a abertura do jogo. Quando o status não pode ser verificado, o mundo permanece pausado até consulta bem-sucedida.
5. `Apex Overlord`, Boss e especiais não podem ser alvos do Farm Offline. Validação também no backend, mesmo para chamadas manuais.
6. A previsão é validada no servidor; se o equipamento selecionado causaria **0 kills**, o farm nem começa, poupando horas perdidas.
7. Botão **DIAGNOSTICAR FALHA**, com endpoint somente-leitura `GET /api/offline-farm/v484/v91/diagnosis`: investiga separadamente timestamps de save e perfil e ledgers NPC/mineração. Os timestamps de uma sessão já concluída podem ser modificados posteriormente, portanto são apenas indícios históricos.

## Proteções preservadas

O SQL de liquidação continua atômico; não foi removida nenhuma verificação de atividade online e nenhuma recompensa é concedida pelo cliente. Não há alteração nas economias, XP, salários, saves, Supabase, NPCs, respawn ou créditos dos jogadores. Uma mesma conta jogando normalmente em outra aba/dispositivo pode continuar levando a conflito, **corretamente**.

## Como instalar

Com V90 (47.7.46) no GitHub, envie o ZIP para raiz e execute **Instalador Universal**. O Render precisa publicar o servidor atualizado. Para usar o APK local, execute **Actions → APK Local** novamente e instale o APK recompilado; o APK antigo ainda contém o JavaScript antigo.

## Teste seguro

1. Com apenas uma aba/dispositivo da **mesma conta**, inicie um Farm Offline com NPC comum fraco em X-1.
2. Não dispare, mine ou conclua recompensas online na mesma conta durante a sessão. Visualizar menus de consulta é permitido; evite compras, resgates e alterações que modifiquem saldo/save enquanto se testa.
3. Após 30 minutos, antes do resgate use **DIAGNOSTICAR FALHA** para verificar as quatro condições, depois resgate.
4. Exija `settled` com `kills > 0` e compare saldo do servidor. Teste depois os menus e Leilão separadamente para localizar possível conflito de operações econômicas.

## Limitação de auditoria

A conexão Supabase disponível nesta sessão não aponta para `stellar-legacy`; por isso não foi executado SQL, lido o histórico individual nem concedido crédito retroativo. A leitura em produção e o teste Android/Render ainda são necessários.
