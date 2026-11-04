# Stellar Legacy V126.0 — correções direcionadas para APK

## Contexto
Observado no APK: a CONF1/CONF2 persiste mas pode surgir um aviso de não confirmação; ativar Autopilot reduz FPS, sobretudo com dispositivo quente e gravador ativo; coleta online de minério e venda do porão ainda aparentam demora.

## Alterações efetivas do pacote
1. **Recibo de montagem após erro de transporte**: quando um `saveCloudSave` de hangar falha após envio, a rotina consulta o `loadCloudSave` autenticado e compara a assinatura integral da montagem submetida com a montagem recebida do servidor. Somente correspondência exata permite registrar `HANGAR SALVO`. Se houve alteração nova enquanto o pedido estava em voo, ela continua pendente. Não aceita o estado local como confirmação, não repete compra nem mexe em moedas.
2. **Mensagem mais precisa**: um erro genérico de comunicação deixa de afirmar que o servidor recusou o estado quando isso não foi comprovado. Persistência desconhecida segue pendente.
3. **Autopilot móvel**: a rotina completa do piloto passa a usar um alvo de 650 ms entre decisões no Android (380 ms em desktop); as checagens de recuperação quando inativo também não ocorrem mais a cada quadro. A atualização do jogo mantém movimento, combate e interpolação em cada frame; somente as decisões auxiliares do piloto são limitadas.
4. **Menos alocação por decisão**: o snapshot do Autopilot calcula capacidade/uso do porão e cotações de munição apenas uma vez por ciclo.
5. **Cache do APK**: nova ponte `stellar-autopilot-v126.js` e sufixo de versão do `game.js`, sem invalidar assets gráficos nem exigir mudanças de API.

## O que NÃO foi modificado
- Concessão de minérios online: continua dependendo do recibo de `grantOreReward` no SQL, e o porão não é aumentado antecipadamente pelo cliente.
- Venda do porão: continua passando por `runEconomyAction('sell_cargo')` e pela confirmação transacional do servidor.
- Créditos, Stellarium, recompensas, itens e regras de combate não foram alterados.
- Nenhum SQL novo nesta versão.

## Verificações
- `npm run check`: imports, assets e release verificados.
- `npm test`: 570 testes aprovados, 0 falhas.
- Ainda depende de **validação no APK real**, especialmente FPS com/sem Autopilot, CONF1/CONF2, coleta de minério e venda remota/presencial.
- Não afirmar que o FPS ou a latência de mineração/venda já melhoraram sem nova medição. Calor e gravação também podem afetar muito a taxa de quadros.

## Próximos gargalos a medir
1. `ore_collect` -> confirmação SQL de minério -> `ore_collected` (latência ponta a ponta, rejeições `range`, `pet_range`, `persistence_error`).
2. `sell_cargo` / `sell_inventory` -> `economy/action` -> recibo de transação (P50/P95, consultas seriadas e reconciliação).
3. Tempo dos estágios de frame `prepMs`, `gameplayMs`, `servicesMs`, `hudMs` e `autopilotMs` no aparelho, sem recorder/carregador como controle.
4. Resultados do readback de hangar em `SAVE_EQUIPMENT_STALE`, respostas 5xx e perda de rede, evitando ACK falso.

## Implantação
Aplicar apenas esta cumulativa pelo Instalador Universal sobre a versão atual (V122/V123/V125). Ela inclui todos os arquivos cumulativos anteriores necessários. O SQL V123/V125 já precisa existir para as rotas econômicas, como nas versões anteriores. Manter `STELLAR_SAVE_V119_MODE=observe`.
