# STELLAR LEGACY V20.2.7 — ANALISADOR DO LOOP + CADÊNCIAS LEVES

## Origem: diagnóstico enviado pelo jogador (V20.2.6)
- Gráfico BAIXO, 484x660, amostra de 240 quadros.
- FPS observado: 12,4.
- Intervalo entre quadros p95: 166,5 ms; trabalho update+Canvas p95: 25,6 ms.
- Atualização JS p95: 20,3 ms; Canvas p95: 7,1 ms.
- Observação: p95 de séries diferentes não pode ser subtraído para explicar um quadro específico.
- Os dados sugerem investigar a execução JS, o agendamento de quadros e outras tarefas/browser/SO, sem culpar exclusivamente a GPU.

## Alterações
1. Novo módulo puro `public/modules/aux-work-scheduler.js`, sem DOM, rede ou save.
2. Caixas bônus verificadas em cadência de 240ms (sem alterar recompensas, quantidades ou tabelas).
3. Polling auxiliar do mundo sincronizado com cadência de 100ms fora dos mapas PvP; nos setores 4-X ele **continua a cada frame**.
4. Atualização visual do HUD de eventos cósmicos a cada ~250ms; progressão de evento e comboio permanecem atualizadas por frame.
5. Processamento de respawn não aloca array novo de NPCs a cada frame; remove in-place somente NPCs mortos expirados, mantendo prazo original.
6. Leitura do relógio de combate dos NPCs compartilhada por frame, evitando repetir cálculos de tempo por NPC.
7. Novo diagnóstico opt-in com p95 das etapas preparação, jogabilidade, serviços e HUD, além de estimativa da espera entre quadros.
8. Console/diagnóstico não enviam dados para servidor; apenas jogador pode copiar relatório.

## O que NÃO mudou
- Regras, números e cooldowns de batalha; dano, escudo, regeneração, CONF1/2, saves e servidor.
- Arquivos SQL, sprites/imagens e instalações de database.
- Limite do gráfico BAIXO (30 fps), nem velocidade efetiva da simulação (dt com teto de 50ms).
- O perfil de desempenho é diagnóstico, não promessa de aumento de FPS.

## Como testar no celular
1. Com uma sessão no mesmo mapa e qualidade BAIXA, entre em CONF → JOGO → Diagnóstico.
2. Ative medições, jogue por 1–2 minutos, copie o relatório.
3. Envie FPS, intervalo p95, tempo JS/Canvas e as novas linhas: espera, jogabilidade, serviços/eventos, HUD.
4. Teste NPCs, troca de mapas, coleta de bônus, combate 4-X, CONF1/2 e progresso após reconectar.
5. Compare com o diagnóstico V20.2.6 (12,4 FPS), sem alterar outras configurações.

## Limitações
Os testes automáticos validam sintaxe, estrutura, dados e regras isoladas, mas não reproduzem GPU, throttling térmico ou agendamento do navegador Android. A espera estimada inclui limitação de FPS e outras tarefas do sistema. Para ganho real é necessário testar no aparelho.
