# Stellar Legacy V34.4.1 — NPC motion patch

Ajustes de movimentação, sem SQL e sem mudanças nas recompensas, dano, saves ou eventos.

- Corrige bug em que o cliente descartava pacotes que continham somente a coordenada `x` **ou** somente `y`. O servidor envia deltas por eixo; a versão anterior esperava os dois e criava saltos visuais em perseguições horizontais/verticais.
- Atualização de NPCs muito próximos (até 800 unidades) passa para até 8 Hz. Demais NPCs próximos continuam 4 Hz, intermediários 2 Hz, distantes 0,4 Hz. Backpressure e interesse por cliente permanecem ativos.
- Suaviza a queda da previsão visual quando uma atualização demora um pouco mais. O servidor continua autoritativo.
- Sem `.github` no pacote, sem novos comandos SQL. Não faz deploy automaticamente.

**Teste sugerido:** perseguições horizontais e verticais; movimentação em círculo; FPS com vários NPCs a 800 unidades; dano/escudos e troca de alvo. Não foi executado teste de FPS real no celular.
