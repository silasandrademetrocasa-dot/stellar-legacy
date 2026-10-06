# V18.1 — DATA DRIVEN CORE

## Stage 1 — concluído
Feature Flags + UI Modules + cache/versionamento/fallback.

## Próximas etapas
2. NPCs + recompensas configuráveis.
3. Mapas + portais + recursos configuráveis.
4. Missões + economia + crafting configuráveis.
5. Central ADM visual para editar tudo sem SQL manual.

# V18 Multiplayer Expansion

## Stage 1 — Sector Control
- 3 control points on each Battle Map (4-1 / 4-2 / 4-3).
- Server-authoritative faction capture.
- Contested zones pause capture.
- No economic reward in Stage 1.

## Planned Stage 2
- Persist sector ownership beyond room lifetime.
- Faction campaign score and controlled rewards.
- Anti-farm participation requirements.

## Planned Stage 3
- PvP objectives, escorts and faction operations.
- Seasonal Warfront ladder and endgame rewards.

- ✅ V18.1.4 — Mapas + Portais + Recursos Data Driven / World Runtime cache.

## V18.1.5 — Missions + Economy + Crafting Runtime

O Runtime de sistemas usa `Supabase -> Render -> systems.runtime.json -> cliente/servidor`.

Agora são configuráveis sem redeploy:
- níveis e multiplicadores das categorias de missão;
- metas/steps e pools de minério dos geradores de missão;
- chance de bônus das missões;
- missões customizadas via banco;
- custos, duração, escala e efeito dos serviços econômicos da base;
- receitas de crafting, ingredientes, custo/moeda, nível mínimo e saída.

O código mantém fallback local para continuidade do jogo se o runtime remoto estiver temporariamente indisponível.


## Central ADM — progresso
- ✅ V18.1.6A Runtime Monitor
- ✅ V18.1.6B Editor de Interface
- ✅ V18.1.6C Editor de NPCs
- ✅ V18.1.6D Editor de Mundo
- ✅ V18.1.6E Editor de Sistemas
- ✅ V18.1.6 FINAL Central ADM consolidada


## V18.1.7 — LIVE COMMERCE & SEASONS
- [x] Stage A: Calendário de Eventos Data Driven (dia/hora/duração).
- [ ] Stage B: Passe de Temporada Data Driven.
- [ ] Stage C: Lojas Comum + Premium Data Driven.
