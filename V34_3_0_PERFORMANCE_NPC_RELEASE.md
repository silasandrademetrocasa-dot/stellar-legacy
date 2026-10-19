# STELLAR LEGACY V34.3.0 — MOBILE PERFORMANCE & NPC INTELLIGENCE

## Base e escopo
- Pacote consolidado com V34.2.0 (otimização de carregamento inicial) e V34.3.0 (IA de NPCs).
- Construído sobre a V34.1.1, preservando **Event Control Center**, migrações V34.1.0/V34.1.1, loja, economia, save, batalha, progressão, sprites V30 e movimentação da nave.
- Não altera a estrutura do Supabase: **nenhuma migração SQL nova necessária**.

## V34.2.0 — carregamento mais progressivo
- `public/modules/staged-preload-v342.js`: preloader testável, sem carregar dezenas de sprites não críticos em um único instante.
- Prioridade imediata para fundo ativo, nave (sprite + sheet), bases e box; portais, modelos remotos, minério e UI complementar entram em lotes de 2 assets no celular / 4 no PC.
- Ao trocar de mapa, invalida apenas fila pendente, sem apagar imagens carregadas nem remover sprites de entidades.
- O desenho continua solicitando as imagens necessárias imediatamente quando estiverem visíveis (sem sprites ocultos).
- Objetivo: suavizar o pico inicial; não afirmar FPS medido sem ensaio em dispositivo real.

## V34.3.0 — IA mais consciente
- `server/npc-intelligence-v343.js`: snapshot dos jogadores elegíveis por ciclo de simulação: evita reavaliar base/portais individualmente para cada NPC.
- Busca de alvos por distâncias quadradas e apenas um `sqrt` no resultado.
- Os NPCs em combate viram gradualmente para o alvo sincronizado pelo servidor (sprites e atlas de 32 direções); em retorno à patrulha, apontam progressivamente para o ponto de origem.
- Se o agressor sumir ou ficar indisponível, a próxima ameaça é o jogador válido com maior dano **já registrado naquele NPC**.
- Preservadas zonas seguras, regras de retaliação, cooldown de ataque, danos, velocidade, saques e ordem de eventos.

## Implantação
1. Envie APENAS este ZIP para a raiz do GitHub e acione o Instalador Universal. **O ZIP não contém `.github`**.
2. Aguarde Render publicar automaticamente o novo commit na branch `main`; não force deploy enquanto o anterior estiver sendo instalado.
3. Reinicie o jogo e teste PC/celular, NPCs em X-1 e PvP, perseguição, perda de alvo e disparo.
4. Em `CONF` use o diagnóstico de FPS local em início e após carregar para comparar com V34.1.1.
5. **Não rodar SQL novo**, nem refazer as migrações dos eventos.

## Verificações offline
- `npm run verify` — 100/100 testes, verificações sintáticas, HTML/imports/assets e checagens de release.
- Não há confirmação de ganho de FPS em dispositivo real nem teste multiplayer de ponta a ponta no Render até a instalação.
