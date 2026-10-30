# Stellar Legacy — V106.8 | Missões com confirmação de recompensa

**Base:** V106.2. Este ZIP é cumulativo: inclui as atualizações da V106.3 à V106.7. Também pode ser aplicado diretamente sobre a V106.7 atual.

## Causa encontrada

A missão era salva em duas etapas: 100% do objetivo e, depois, o pagamento e a limpeza da categoria. A animação/toast e o contador de missões eram atualizados ANTES de confirmar a segunda gravação. Quando um NPC era recompensado pelo servidor nesse intervalo, SAVE_NPC_STALE podia rejeitar o pagamento, recuperar a missão pendente e disparar nova animação com a mesma recompensa.

## Proteções novas

- O cliente só mostra **recompensa confirmada** e conta a conclusão na telemetria DEPOIS do ACK do save que inclui o recibo `missions.completed`.
- Uma tentativa rejeitada preserva o mesmo sorteio de munição/equipamento até a gravação confirmada, sem rerrolar a cada tentativa.
- A categoria fica bloqueada para nova aceitação enquanto o pagamento anterior aguarda confirmação.
- `PUT /api/save` passa a rejeitar regressão de progresso (70/70 -> 69/70), remoção/alteração de comprovantes já existentes e encerramento de missão sem comprovação prévia do objetivo persistido.
- Os novos códigos de conflito `SAVE_MISSION_STALE` e `SAVE_MISSION_UNVERIFIED` entram na rotina segura de reconciliação, sem mexer nas revisões econômicas ou ignorar as rejeições `SAVE_NPC_STALE`.
- Script do jogo com nova chave de cache para que o navegador/WebView carregue a correção.

## Limite de segurança

A conclusão continua sendo materializada pelo save oficial, sem criar novo emissor de STL ou créditos. **Não é uma migração para um ledger transacional dedicado de missões**; testes práticos devem verificar se o banco realmente recebeu o recibo. Esta atualização não altera missões passadas nem recupera eventuais recompensas de tentativas anteriores.

## Testes e validação

- `npm run verify`: 279/279 testes aprovados, incluindo 10 novos cenários de reenvio, rollback e ACK.
- `scripts/prepare-apk-assets.js` + `scripts/verify-apk.js`: 1.220 arquivos locais, 1.027 imagens, sem falhas.
- Teste real: iniciar missão em 1 abate antes do objetivo, lutar com Autopilot, observar `SAVE_NPC_STALE`, confirmar apenas UMA mensagem de **recompensa confirmada**, aceitar próxima missão e relogar. Em ambiente de teste, provocar conflito de revisão NPC entre as etapas de salvamento.
- Nenhum SQL extra da V106.8. Os SQLs anteriores de mapas e venda automática permanecem separados, dentro deste ZIP, e **não foram aplicados**.
- APK Android novo obrigatório para quem usa assets embarcados; Render e APK devem estar na mesma versão. Não desinstale o aplicativo com save pendente.

## Operação

Aplicar o pacote sobre a raiz do projeto com o Instalador Universal ou extraindo as pastas na raiz GitHub. **Não extrair sobre um repositório vazio**. Encerrar Autopilot/farm e confirmar o save ANTES do deploy. Não fazer deploy no meio de um resgate offline.
