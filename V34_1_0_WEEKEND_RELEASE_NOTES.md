# STELLAR LEGACY V34.1.0 — GALACTIC WEEKEND EVENTS

## Agenda acordada
- Sábado e domingo, horário oficial `America/Sao_Paulo`
- Janelas: `11:00–13:00`, `14:00–16:00`, `17:00–19:00`, `20:00–22:00`
- 8 eventos por fim de semana, 120 minutos por ocorrência, 60 minutos livres entre janelas
- Rotação circular persistente, âncora: sábado 24/10/2026 às 11h
- Ordem existente por prioridade: invasion → prime → mining → convoy → battle. Ao desativar um evento, ele sai da fila automaticamente.
- Eventos criados manualmente no modo **once** continuam uma exceção possível ao calendário normal; as exceções existentes têm precedência.
- NPCs, recursos e comboios do evento encerrado são removidos como já era feito pela V34.
- Mesmos objetivos, itens, multiplicadores e recompensas anteriores. Não altera saves.

## Como instalar (sem risco de descompasso)
1. Instale o código deste ZIP pelo seu instalador universal e aguarde o Render ficar saudável.
2. **Depois** execute no Supabase o arquivo `sql/V34_1_0_GALACTIC_WEEKEND_EVENTS.sql` (SQL Editor). Ativa apenas os cinco eventos oficiais e sincroniza a validação de recompensa.
3. Confira a rota `/api/live-ops` (autenticada) ou no ADM; os cinco eventos terão `rules.weekend_rotation=true` e `duration_minutes=120`.
4. Teste sábado com dois pilotos em mapa PvE e PvP, evento, recompensa, encerramento e próximo ciclo.
5. Em caso de reversão, use `sql/V34_1_0_WEEKEND_EVENTS_ROLLBACK.sql` para recuperar as agendas anteriores; depois restaure o código anterior.

IMPORTANTE: nenhum SQL deste pacote roda sozinho pelo ZIP. Não aplique o SQL antes da implantação do código V34.1.0: versões anteriores não compreendem a flag de rotação e poderiam voltar a gerar eventos fora de hora.
