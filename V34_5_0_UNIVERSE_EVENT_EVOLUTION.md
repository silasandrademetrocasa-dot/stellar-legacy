# STELLAR LEGACY 34.5.0 — UNIVERSE & EVENT EVOLUTION

## Quatro frentes
1. **Fases de evento:** os eventos existentes percorrem até quatro etapas (com base nos horários oficiais publicados pelo ADM). Cada etapa altera a pressão das ondas ou a densidade de minérios; o jogador vê a etapa no HUD e no painel.
2. **Bosses evoluídos:** transições de HP ajustam ritmo e comportamento. A fase 2/3 pode chamar reforços comuns com limites definidos no ADM. O boss reaparece sem ficar bloqueado pelos próprios reforços.
3. **Universo vivo:** encontros de NPCs ELITE no ciclo de ondas das etapas avançadas e recursos em intensidade progressiva, com limites para preservar FPS e economia.
4. **ADM:** controles de etapas, progressão de ondas, elites, reforços, minérios e ritmo de comboio. Objetivos e prêmios mantidos; o RPC existente recebe novos limites após a migração SQL.

## Instalação
1. Enviar o ZIP completo pelo Instalador Universal, aguardar Render LIVE.
2. **Depois aplicar** `sql/V34_5_0_EVENT_EVOLUTION_ADMIN.sql` no Supabase. O código é compatível com o período de transição; sem o SQL, o painel não consegue salvar os novos campos.
3. Testar o ADM, período dos eventos, boss HP, mineração, PvP e FPS. Nenhum SQL é executado automaticamente pelo ZIP.

## Segurança
- Sem alteração em tabelas de saves, créditos, itens, recompensas ou metas existentes.
- Bounded wave spawns (12/tick, máximo de 48 vivos) e limites por fase.
- Minérios limitados a 28 por evento e 20 por chamada.
- Boss escorts disparam somente na passagem das fases de HP, não em todo disparo.
- A programação de sábado/domingo, os horários, a rotação e a proteção dos jogadores continuam como na V34.4.3.
- O SQL substitui somente o RPC do ADM preservando `is_game_admin_v1763`.
