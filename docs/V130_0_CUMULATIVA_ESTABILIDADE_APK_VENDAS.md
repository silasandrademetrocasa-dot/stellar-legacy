# Stellar Legacy V130.0 — cumulativa de estabilidade, vendas e Android

**Base:** projeto completo V126.0 validado com ZIP cumulativo V126.0.  
**Entrega:** um único deploy para o jogo já instalado via ZIP incremental; o projeto completo também acompanha o release em partes de até 24 MB para cópia/backup.

## Diagnóstico da venda (causa identificada no código)

- `syncBeforeEconomy()` era invocado antes de TODA venda e podia bloquear a operação aguardando `cloudDirty`, `equipmentSavePendingV109`, `missionSavePendingV105` ou `AMMO_SELECTION_V1061.pending`.
- A rota autoritativa de venda já existia em `/api/economy/action`, com `sell_cargo` e `sell_inventory`, e não precisava desse PUT genérico como pré-condição. Ela lê o `game_saves` do servidor e faz liquidação com o recibo transacional V125.
- Além disso, a venda de carga consultava o snapshot de catálogo LIVE OPS mesmo quando os preços oficiais estavam disponíveis no World Runtime; isso gerava uma dependência de rede desnecessária.
- Alguns botões de venda exigiam a base, mesmo quando o Terminal Mercante Remoto Elite estava equipado. A interface agora segue `canSellCargoNow()`.

## Correções V130

1. `sell_cargo` e `sell_inventory` usam **servidor primeiro**; pendência visual do hangar/missão não cancela automaticamente a venda. O servidor continua validando a posse real, a localização e os valores.
2. `sell_drone` conserva pré-sincronização rigorosa para evitar problemas de equipamento e desmontagem da frota.
3. `request_id` é preservado em uma única tentativa de repetição em erros transitórios; o servidor impede duplo crédito pela tabela `stellar_economy_receipts_v125`.
4. O cálculo de cotação do porão está em `server/cargo-sale-v130.js`, testável de forma isolada, sempre sobre os dados do save oficial.
5. A rota de venda de recursos lê o World Runtime e só usa LIVE OPS como fallback quando necessário. Recurso desativado não pode ser vendido; Voidite fica fora da venda.
6. Mensagem específica quando a coleta/mineração ainda não foi confirmada no banco — não adianta creditar apenas o porão local.
7. Tempo de operação local e tempo reportado pelo servidor podem ser inspecionados no APK/DevTools via `window.stellarEconomyMetricsV130.snapshot()`. O registro não contém nomes, IDs de jogador, moeda ou inventário.
8. Durante Autopilot, atualizações dispendiosas do **painel de missões** passam a ser agrupadas (até 900 ms), sem atrasar os cálculos de combate e recompensa.
9. A cotação visual faz fallback de cache quando um recurso não aparece num snapshot parcial, mas o preço efetivo da venda continua vindo do servidor.

## Status do roadmap V127–V130

| Frente | Entrega verificada | Estado |
|---|---|---|
| V127: venda porão/loja | Bloqueio pré-venda corrigido no cliente e preço oficial otimizado no servidor | **Código pronto; APK ainda não testado** |
| V128: Autopilot/Farm | Melhorias V126 preservadas; painel de missões com throttle no Autopilot; farm SQL existente preservado | **Otimização parcial, sem refatoração do liquidante** |
| V129: PvP/clãs/Warfront | Sistemas existentes preservados sem mudanças de protocolo ou regras econômicas | **Integração com save único ainda parcial** |
| V130: consolidação | Única atualização incremental + projeto fonte completo + testes | **Release candidate** |

**Não alegar que houve migração 100% do PvP/Warfront ou que o FPS 30 está homologado em Android**. Esses critérios precisam de bateria real e testes de concorrência. Modo `enforce` fica desligado.

## Banco e SQL

- Nenhuma tabela nova, nenhuma alteração de schema e nenhum reset de contas nesta versão.
- Exige as migrações V123 e V125 já aplicadas no projeto Supabase (verificar `stellar_economy_receipts_v125` e `stellar_commit_economy_operation_v125`).
- Não executar o SQL histórico inteiro; não trocar `observe` para `enforce`.
- `game_saves` permanece como estado econômico autoritativo remoto; IndexedDB como cache/diário local, não como origem de Créditos ou STL.

## Teste final recomendado no APK

1. Acesse a base X-1 ou X-8 e confirme que o porão possui Ferron, Cryon, Virel, Duracite, Ferrite ou Solarium.
2. Com uma missão e/ou troca CONF pendente, tente **vender um único recurso**. O cliente não deverá bloquear por causa dessas pendências locais.
3. Verifique o acréscimo exato de créditos e a subtração exata da quantidade do recurso na resposta oficial; depois reinicie o APK.
4. Venda todos os recursos restantes, volte ao jogo e confira o saldo no servidor.
5. Se equipado com Terminal Mercante Remoto Elite, teste fora da base e, separadamente, teste sem CPU (a segunda operação deve ser negada pelo servidor).
6. Com Autopilot ativo, abra Missões e compare FPS com a V126.0 em condições térmicas semelhantes.
7. Se falhar, registre a mensagem/código de erro, momento, tela, recurso e tempo. Consulte `stellarEconomyMetricsV130.snapshot()` no depurador do WebView.

## Limitações honestas

- A implementação elimina um bloqueio identificado estaticamente; **o sucesso real das vendas ainda precisa ser confirmado no APK com o Render atualizado**.
- Se o recurso estiver somente no cliente, mas ainda não tiver sido contabilizado pelo servidor, a venda continuará negada corretamente.
- Os fluxos de PvP, Warfront e liquidante de Farm anteriores continuam funcionando pelas rotas existentes e **não foram reescritos nesta cumulativa**.
