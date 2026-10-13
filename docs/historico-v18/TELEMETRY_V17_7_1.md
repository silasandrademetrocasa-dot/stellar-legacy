# Telemetria de progressão

O objetivo é permitir balanceamento baseado em dados sem expor o painel aos jogadores. O cliente acumula contadores durante a sessão e envia lotes aproximadamente a cada 45 segundos. Cada lote possui um `batch_id`, impedindo contagem duplicada em retries.

## Indicadores

- Tempo ativo e número de sessões.
- Nível e marcos de nível com tempo acumulado e kills até o marco.
- NPCs eliminados, boxes coletadas, mineração, missões concluídas, mortes e saltos.
- CR e STL gerados/gastos.
- XP gerado.
- Separação por origem: NPC, missão, recursos, passe/nível, evento, portal, exploração e outros.
- CR/h, STL/h e XP/h por jogador no painel ADM.

## Privacidade operacional

Jogadores comuns não possuem leitura direta das tabelas de telemetria. O overview e o detalhe individual são retornados somente por RPCs que verificam `game_admins`.

## Reset

O reset completo continua exclusivo do painel ADM. Ao resetar uma conta para teste, também são apagados os marcos e agregados de telemetria daquela conta, permitindo medir uma nova jornada desde o início.
