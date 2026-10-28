# STELLAR LEGACY V74 — auditoria e correção visual de desempenho (Web)

## Base exata
- ZIP de Git fornecido pelo jogador: release **47.7.29** (V73).
- Destino da atualização: **47.7.30** (V74).
- Tecnologia atual: Canvas 2D, requestAnimationFrame, assets via cache e CSS HUD.

## Achados verificáveis no código antes da correção
1. `public/game.js`: ajuste adaptativo de resolução era aplicado via `resize()` **após** o `draw()` do quadro. `resize()` altera width/height do canvas e zera o buffer, podendo deixar tela vazia até o próximo rAF. Eventos `resize` também faziam o reset fora do loop de desenho.
2. `public/modules/adaptive-resolution-v70.js`: atraso de entrega de rAF, mesmo sem carga elevada de trabalho mensurado, forçava redução de escala e resets. Os intervalos fornecidos pelo jogador eram de 100–283 ms no P95, acima do trabalho de desenho medido.
3. `public/style.css`: Qualidade MÉDIA ainda executava `backdrop-filter:blur(4px)` em painéis HUD sobre Canvas animado; risco alto de recomposição onerosa em GPU Android. Não é prova de causalidade isolada, mas correção de baixo risco.
4. `public/game.js`: círculo de captura com raio ~360 px, preenchimento/tracejado, era redesenhado sempre que o relé entrava no campo de visão. A área lógica de captura não depende desse desenho.
5. Texturas em `public/assets/animations/v71/Reles/Nivel_{1,2,3}/base.webp`: canvas 200×240 com conteúdo visível em bounding boxes diferentes. Antes o desenho usava os 200×240 inteiros, levando a escala e alinhamento visual inconsistentes.

## Correções
- Canvas é redimensionado no começo de um quadro aceito, seguido imediatamente pelo desenho. Eventos de `resize` não zeram o buffer fora do loop.
- Resolução adaptativa só reduz escala com evidência de sobrecarga do tempo de trabalho do jogo; stalls de rAF sozinhos não alteram a escala.
- HUD móvel Médio/Alto troca o blur de fundo por fundo quase opaco; mantém bordas, cores e informações de combate.
- O anel **visual** do relé móvel Médio/Baixo conserva o raio, mas não usa dash longo nem fill de zona de captura. Hitbox/alcance são preservados.
- Cada relé passa a ser desenhado usando recorte fixo do sprite visível, centralizado e dimensionado para o nível, sem `getImageData` nem alocação por quadro.
- Nenhum endpoint, SQL, lógica do servidor, saves, NPCs, dano, escudo ou moedas foi modificado.

## Provas locais
- V73 original: 67/67 testes automatizados aprovados.
- V74 código modificado: 71/71 testes aprovados (4 testes adicionais, inclusive variações de rAF e crop de relés).
- Teste de fluxo do Instalador Universal: registrado separadamente após empacotamento.

## Limites / teste real
**Ainda não existe benchmark pós-V74 no celular do jogador.** Ganho de FPS é hipótese técnica a confirmar; não afirmar 30 FPS de imediato.
Testar no Chrome com a aba ativa e mesma orientação/resolução:
1. MÉDIO, mapa sem relé, 60 s.
2. MÉDIO, chegar a ~250 unidades de um relé, 60 s.
3. Trocar para BAIXO e de volta para MÉDIO, conferir ausência de flashes negros e estabilidade da posição do relé.
4. Copiar diagnóstico local e comparar `FPS jogando`, `rAF bruto p95`, `tarefas longas`, `event-loop p95`, `draw Canvas p95` e `desenho estruturas p95`.
5. Caso existam freezes, testar o rollback; coletar relatório antes de voltar.

## Instalação
- Subir APENAS o ZIP V74 à raiz do GitHub.
- Rodar `Stellar Legacy — Instalador Universal`.
- `baseVersion`: 47.7.29. Nova `version`: 47.7.30.
- Não executar SQL no Supabase.
- Rollback tem base 47.7.30 e restaura 47.7.29 com exclusão dos 2 arquivos novos.
