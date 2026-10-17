# STELLAR LEGACY V20.2.2 — MONITOR DE DESEMPENHO

Base: ZIP completo da V20.2.1. Etapa 3 da fundação do jogo: **observabilidade local do cliente**.

## Arquivos envolvidos

- `public/modules/performance-monitor.js`: métricas de quadros em memória, teto de 240 amostras; não acessa DOM, rede ou contas.
- `public/game.js`: opt-in em torno do `update(dt)` e `draw()` existentes, mantendo ordem, timers e `monitorAutoPerformance(t)` da V20.2.1.
- `public/index.html`: CONF → JOGO → Diagnóstico, HUD compacto e botões.
- `public/style.css`: layout responsivo.
- `tests/performance-monitor-v2022.test.mjs`: testes de FPS, 30 FPS legítimos, pausas, engasgos, limites, opt-in e relatório.
- `scripts/verify-release.mjs`: confirma a presença do módulo.
- `package.json`, `server/index.js`, parâmetros de cache JS/CSS: versão 20.2.2.

## Métricas disponíveis

- **FPS observado**: quadros processados no loop já limitado pelo perfil de qualidade; não é taxa nativa da tela.
- **Quadro P95**: percentil 95 do intervalo entre quadros processados nos últimos 240 quadros. Não é latência de rede.
- **Update + desenho P95**: tempo de execução das funções `update` e `draw`; não inclui composição de GPU/browser.
- **Quadros longos**: acima de max(80 ms, 2,5 × intervalo alvo). FPS normal limitado a 30 não é contado como travamento.
- **Heap JS**: `performance.memory.usedJSHeapSize` experimental e não disponível em todo navegador. Não mede RAM total, GPU ou consumo de memória do aplicativo.
- **Imagens em cache**: contagem interna de imagens do jogo; não inclui HTTP cache nem memória de GPU.

## Privacidade e recursos

- Desligado por padrão. Não há envio de métricas nem chamadas à API; o monitor não toca em contas, progresso, localStorage ou Supabase.
- O relatório só vai para a área de transferência após clique no botão. Não traz callsign, endereço, tokens ou IDs.
- O diagnóstico pode ser desligado sem perda de progresso; amostras ficam apenas na memória do navegador até fechar/recarregar.

## Como validar em celular

1. Instale somente após validar a V20.2.1; verifique `/health` = `20.2.2`.
2. CONF → JOGO: habilite o diagnóstico. Ligue o contador opcional para observar em tempo real.
3. Jogue em mapa calmo, mapa com muitos NPCs, troque de mapa, abra menus, faça batalha.
4. CONF → JOGO: toque em **Copiar relatório técnico** e cole no ChatGPT para analisar os números.
5. Desligue o diagnóstico ao acabar. Nenhum SQL novo.

## Limitações

As verificações automatizadas não reproduzem FPS real do Android ou a conexão ao Supabase de produção. Estas medições são feitas durante o jogo no próprio dispositivo e servem para orientar otimizações futuras.
