# STELLAR LEGACY V34.1.1 — EVENT CONTROL CENTER

## Novidades
- ADM → EVENTOS: agenda visual com até 16 horários por semana, duração de 15–360 min, qualquer dia, validação de sobreposição e prévia antes de publicar.
- Os oito horários oficiais permanecem como **padrão**: sáb/dom 11–13, 14–16, 17–19, 20–22 (horário de São Paulo).
- Liga/desliga global, troca ordem pela prioridade e ativa/desativa eventos individualmente.
- Edita metas, créditos, STL, XP e cores; controles seguros de quantidade de NPCs/minérios e intervalo das ondas.
- Evento extraordinário manual com início/encerramento e retorno automático à programação normal.
- Proteções de permissões de ADM no Supabase, limites, transação do banco e pagamento uma vez por ocorrência.
- Configuração consumida por cliente, servidor e RPC de recompensa, sem novo deploy para modificar cada horário.

## Instalação obrigatória (nesta ordem)
1. Instalar o ZIP V34.1.1 pelo instalador universal do GitHub; aguardar Render publicar a versão.
2. Executar `sql/V34_1_1_EVENT_CONTROL_CENTER.sql` no Supabase `stellar-legacy` **somente após o deploy estar LIVE**.
3. Reabrir o jogo; abrir ADM → EVENTOS; confirmar os oito horários e os cinco eventos, editar apenas se desejar.
4. Testar um evento manual com um piloto de teste, encerrá-lo e confirmar retorno da grade; verificar recompensas e FPS.

**Não executar o SQL com código V34.1.1:** o cliente e servidor antigos não conhecem o novo calendário configurável.
**Não foi feito deploy ou alteração SQL de produção na preparação deste ZIP.**

## Segurança / limites
- A operação de publicação é autenticada e checada por `is_game_admin_v1763` no Supabase.
- Horários: 1 a 16 slots, 15–360 minutos, sem sobreposição nem passagem da meia-noite.
- Recompensas têm limites explícitos; salvá-las pode afetar o evento atual e deve ser deliberado.
- Eventos manuais interrompem temporariamente a programação regular; não alteram as tabelas de saves.
- Ondas só afetam tipos de evento aplicáveis; NPCs e minérios continuam limitados por desempenho no servidor.

## Testes
`npm run verify` + revisão da integridade do ZIP. Testar em dispositivo real para validar usabilidade e sincronização efetiva.
