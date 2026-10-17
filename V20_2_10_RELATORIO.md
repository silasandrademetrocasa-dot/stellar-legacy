# Stellar Legacy — V20.2.10 · Agendador de quadros e diagnóstico rAF

## Base e motivação
Compilado como atualização completa sobre a V20.2.9.
No Android do teste: 13,3 FPS observados, processamento p95 de 17,9 ms, espera estimada p95 de 138,7 ms e Canvas p95 de 9,2 ms. Números sugerem a investigação do agendamento (sem provar culpa do navegador).

## Mudanças técnicas
1. Novo `public/modules/frame-gate.js`, módulo pequeno e testável: tolerância limitada a **1,5 ms** no limite de atualização rAF. Em telas cujos callbacks chegam cerca de 16 ms separados, os pares de callbacks (~32 ms) deixam de ser sistematicamente descartados por ficarem abaixo dos 33,33 ms exigidos pelo modo BAIXO. Preserva `dt` cap de 0,05 s, combate e a chamada normal de requestAnimationFrame.
2. `public/modules/performance-monitor.js` agora registra opcionalmente também os callbacks **brutos do navegador**, incluindo os que o limitador descarta; janela de 240 amostras, sem envio de dados online. Novos indicadores: **FPS rAF bruto**, **intervalo rAF bruto p95** e **descartes por limitador / callbacks rAF**.
3. `public/index.html` mostra as novas métricas em CONF > JOGO > DIAGNÓSTICO, sem mudar o contador de FPS clássico.
4. Esclarecimento no relatório: amostras em configurações e em jogabilidade são *históricas*, não simultâneas; ambas podem atingir 240 após sessões longas.
5. Ajustadas versões e cache-busting para `20.2.10`, mantida a validação automática de release no Render.

## Como interpretar o próximo relatório
- Se **rAF bruto** estiver ~15 FPS, o gargalo está *antes* da nossa renderização aceita: investigar browser/Android, outros processos, timers/long tasks e dados da tela.
- Se **rAF bruto** estiver ~60 FPS e houver muitos **quadros pulados pelo limitador**, o corte rAF era parte da limitação e esta mudança deve melhorar o ritmo de entrega.
- Se o **rAF bruto** for alto e os descartes baixos, mas FPS observado continuar reduzido, investigar processamento JS síncrono e gargalos de composição do navegador.
- `p95` mede picos; não some nem subtraia percentis para explicar um único frame.

## Preservações
- Nenhuma migração SQL e nenhuma alteração proposital nas regras de dano, munição, escudos, nave, NPC, PvP ou conteúdo salvo.
- Não há FPS mínimo garantido; a validação foi local, não feita no Android real.
- Evitar executar o instalador com outro ZIP `stellar-legacy*.zip` simultaneamente na raiz do GitHub.

## Procedimento de teste
1. Fazer um teste repetível no mesmo mapa, qualidade BAIXA, diagnóstico ATIVO durante 60–90 segundos.
2. Em CONF > JOGO > DIAGNÓSTICO, copiar o relatório para comparar `FPS observados`, `rAF bruto`, `rAF pulados`, `tempo update` e `espera`.
3. Repetir um teste de 60 segundos com as configurações abertas e observar se a cena mudou, sem confundir históricos.
4. Conferir de novo disparos contínuos, PvP 4-X, troca CONF1/CONF2, salvamento e retorno de mapa.

## Validação
Comandos: `npm run verify` (sintaxe, imports, caminhos de assets e testes automatizados).
