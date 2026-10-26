# Stellar Legacy V73 — HUD leve e profiler de fases

**Base obrigatória:** 47.7.28 (V72). **Destino:** 47.7.29.

## Mudanças
- A atualização periódica de HUD não usa mais `updateUI()` completo: apenas saldos, XP, carga, missões e desbloqueios quando o perfil precisa.
- Painel de portal reposicionado na cadência rápida de 250ms, sem alterar alcance ou regras.
- Agendador não crítico limitado a uma solicitação a cada 1250ms. Mudanças explícitas continuam usando `updateUI()`.
- Diagnóstico P95 por grupos de desenho (fundo, estruturas, entidades, efeitos, minimapa); métricas locais, opt-in.

## Limitações
A redução do custo de HUD é estrutural, mas não comprova melhora de FPS. Relatórios V71 e V72 foram feitos com alturas diferentes de Canvas. Usar mesma orientação, mapa, combate e qualidade por 60s antes de comparar. Tarefas longas podem vir de navegador/compositor ou callbacks fora do jogo que ainda devem ser investigados.

## Rollback
Use o patch de rollback V73 para V72 se o comportamento piorar. Nenhum SQL necessário. Não altera combate, saldo, inventário, mapas, NPCs, hitboxes ou regras de teleporte.
