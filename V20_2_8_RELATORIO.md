# STELLAR LEGACY V20.2.8 — RELATÓRIO TÉCNICO

## Origem: medição real no Android (V20.2.7)
| Indicador | Medição |
|---|---:|
| Resolução | 484×660 |
| Qualidade | BAIXA |
| FPS | 14,7 |
| FPS V20.2.6 anterior | 12,4 |
| Intervalo entre quadros p95 | 116,5 ms |
| Espera estimada p95 | 94,2 ms |
| Trabalho update + Canvas p95 | 31,6 ms |
| Atualização JS p95 | 25,5 ms |
| HUD JS p95 | 22,4 ms |
| Gameplay JS p95 | 4,8 ms |
| Serviços JS p95 | 2,0 ms |
| Canvas p95 | 8,8 ms |
| Quadros longos/240 | 27 |

**Interpretação cautelosa:** HUD é a etapa mais custosa no p95 reportado; percentis independentes não somam nem explicam um quadro exato. O ganho de +18,5% entre versões é observado em sessões distintas e pode variar conforme o cenário. O intervalo de espera depende também do dispositivo/navegador/limite de FPS.

## O que mudou
1. Escritas DOM no HUD evitadas quando texto ou URL do sprite não mudou.
2. Atualização completa agendada usa cache de assinatura de menus/nível/configuração, sem varrer a árvore de navegação repetidamente.
3. Estoque/seleção/custo de tiro das munições só refaz botões e tooltips quando seus dados mudam; reinicialização ao reconstruir botões.
4. Contagem de hostis do alerta tático sem criar array temporário.
5. Subdiagnóstico isolado: HUD completo, HUD crítico, munições e contagem de amostras de HUD completo.
6. `updateUI()` explícito em compras/menus e eventos continua imediato. Regeneração, nave, AUX, cooldowns, PvP e movimentação preservados.

## Validação local
- `npm run verify` — **178 testes passaram**, checagem de sintaxe, imports, versão, referências gráficas e instalação Render.
- 52 arquivos JS verificados, 216 URLs de imagens conferidas.
- SQL, gráficos, regras de combate e backend intactos; package/version e referências de HTML atualizados para 20.2.8.

## Teste recomendado após instalar
1. No mesmo aparelho e mapa da V20.2.7, ativar o diagnóstico, escolher BAIXA e ficar 1–2 minutos em navegação, depois batalha contra NPCs.
2. Copiar o relatório inteiro (inclui novas linhas `HUD completo`, `HUD crítico`, `HUD munições`).
3. Confirmar que HP e escudo mudam durante combate, seleção de munições e compra refletem estoques, trocar CONF1/2, entrar em mapas, abrir menus, relogar e checar saves.
4. Se o HUD cair mas os 14 FPS persistirem, o gargalo remanescente pode ser o agendamento de quadros/SO/navegador. Considerar instrumentação da fila de RAF e long tasks sem mexer na simulação.

**Limitações:** Nenhum benchmark de Android foi executado aqui. P95s não indicam causalidade por si só e ganhos de FPS precisam ser observados no dispositivo.
