# Stellar Legacy V72 — tratamento do HUD e diagnóstico da cadência do navegador

Versão-base: **V71 / 47.7.27**. Atualização: **V72 / 47.7.28**.

## Evidência inicial fornecida pelo jogador (qualidade Média)
- FPS jogando: **10,4** (240 amostras), FPS em configurações: **41,1** (podem ser janelas históricas distintas).
- P95 intervalo entre quadros: **99,9 ms**; P99 **216,5 ms**.
- P95 update+draw: **17,3 ms**; P95 Canvas: **8,0 ms**; P95 atualização JS: **10,3 ms**.
- P95 da espera residual estimada: **91,2 ms**, **não** é uma leitura direta de GPU.
- P95 atualização completa do HUD: **19,8 ms**, somente **13 amostras**.
- Limitação: um período P95 pode ter muito trabalho fora do bloco monitorado, composição e throttling do browser. Não se pode atribuir causa única ao rAF.

## Intervenções de risco baixo
1. `public/modules/deferred-hud-v72.js`: o HUD completo e as operações DOM associadas passam a ser executados via **uma única tarefa ociosa cancelável**, com fallback para timer em navegadores sem `requestIdleCallback`. A atualização explícita de ações do jogador cancela o trabalho pendente e continua síncrona. Sem timers por NPC e sem novos loops rAF.
2. `public/game.js`: `updateFrameHudV2024` atualiza o HUD crítico no quadro, mas não executa a atualização completa no bloco update+draw; a atualização completa é executada na fila. O agendador existente continua controlando a frequência. A fila pendente é cancelada ao ocultar a página.
3. `public/modules/browser-latency-v72.js`: diagnóstico **opt-in**, sem transmissão ao servidor, do atraso do event loop com pulso de 500 ms e `PerformanceObserver` de `longtask` quando disponível. Instrumentação não é ativada fora do modo diagnóstico.
4. Relatório copiado passa a distinguir: long tasks (se suportado), atraso de timers, custo do HUD diferido e tempos rAF já existentes.

## Sistemas deliberadamente intocados
Movimento/`delta time`, interpolação multiplayer, balística, HP, escudo, spawns, recursos, moeda, autenticação, portais, NPCs, bases, relés, mapas e mecânicas do servidor permanecem no mesmo código. Nenhuma alteração ao banco de dados.

## O que NÃO foi comprovado
- **FPS em celulares após V72: ainda não medido.** Não afirmar meta de 30 FPS atingida.
- `requestIdleCallback` ainda roda na thread principal; separar HUD da janela do rAF **não elimina necessariamente** bloqueios da composição gráfica ou GPU.
- Indicadores `longtask` dependem de suporte do navegador; `API indisponível` não significa ausência de bloqueios.
- P95 da espera entre quadros não mede a composição GPU nem latência de rede.

## Como testar no celular
1. Instalar V72 no GitHub somente após V71 estar implantada. Reiniciar o jogo/atualizar a página.
2. Habilitar diagnóstico e manter o jogo visível por pelo menos **60 segundos** em qualidade MÉDIA, no mesmo mapa da medição anterior.
3. Copiar o relatório completo; observar `FPS jogando`, `P95/P99`, `tarefas longas`, `atraso event-loop` e `HUD completo fora do rAF`.
4. Fazer mais 60 segundos com NPCs/combate e, depois, perto de relés/bases. Repetir em Baixo/Alto.
5. Se FPS ainda ~10 e atrasos de timer altos, investigar outras tarefas fora do loop; se tarefas longas baixas e rAF ainda atrasado, priorizar composição, CSS, GPU/thermal e Chromium/Android.
6. Usar o ZIP de rollback V72 → V71 se qualquer controle, combate ou interface apresentar regressão.

Nenhum resultado de FPS pós-patch foi simulado. Testes automatizados validam apenas o código e a instalação.
