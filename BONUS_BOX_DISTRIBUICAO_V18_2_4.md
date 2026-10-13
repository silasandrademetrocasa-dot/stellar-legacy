# Stellar Legacy V18.2.4 — BOX BÔNUS por mapa

## Regras atuais

| Setores | Mapas internos | Quantidade de BOX BÔNUS |
|---|---|---:|
| X-1, X-2, X-3, X-4 | `x1`, `x2`, `x3`, `x4` | **20 por mapa** |
| Battle Maps 4-1, 4-2, 4-3 | `b41`, `b42`, `b43` | **30 por mapa** |
| AURORA, NEXUS, ECLIPSE | `ggAlpha`, `ggBeta`, `ggGamma` | **0** |
| Outros mapas não cadastrados | — | 0 (seguro por padrão) |

As caixas são individuais por jogador, preservadas por mapa no save. O total é o teto de vagas: caixas coletadas ficam em cooldown por 40–70 s; o setor pode mostrar temporariamente menos caixas. Após a espera, repõe até o limite.

**Migração automática da V18.2.3:** o save antigo com 12 caixas e reposições pendentes é complementado para 20 ou 30 sem duplicar as reposições pendentes. Caixas antigas em portais são descartadas, mas a Poeira Stellar e todos os saldos do jogador permanecem intactos. Em portais não é possível coletar caixas, mesmo se algum dado visual antigo restar em cache.

**Sem outras mudanças:** sete recompensas, AUX-9 Salvager e materializador (100 STL padrão, 90 STL Premium ou 1 Poeira por giro) continuam iguais à V18.2.3.

**Instalação:** apenas ZIP completo no instalador automático; não há SQL novo.

**Testes:** `node tests/bonus-box-dust-regression.mjs`, `node test_smart_missions.mjs`, `node tests/mobile-lite-regression.mjs`, `node tests/shop-confirmation-regression.mjs`, `node tests/coupon_ui_smoke.mjs`.
