# Stellar Legacy V71 — Correções visuais e contenção de custo gráfico

## Base necessária
V70, `47.7.26`. Novo release: `47.7.27`. Patch somente visual, sem SQL.

## Evidências da captura do jogador
Gravação 1600×720 de 112 segundos, amostrada aproximadamente a cada 8 segundos:
- no início, contador próximo de 33 FPS;
- entre 24 e 64 s, leituras da ordem de 9–12 FPS em mapa 1-8 e proximidade de base;
- no 4-1, leituras da ordem de 8–10 FPS.
Isso evidencia degradação, mas não atribui sozinho a culpa a um único componente.

## Problemas identificados no código V70
1. `drawPortalV69`: portal completo é desenhado no Canvas e novamente por cima dentro de recorte circular; aumenta mistura alfa e pode deformar o núcleo.
2. `drawBaseV69`: quadro inteiro de 840×490 é trocado a 5–7 FPS, inclusive pixels estruturais estáticos; gasta memória de textura e permite trepidação visual.
3. `drawWarfrontControlWorld`: além de anéis de HP/escudo, pintava o disco inteiro translúcido de raio amplo dos relés, sobrepondo muitos pixels a cada quadro.
4. `drawRelayV69`: texturas estáticas 300×360, embora sejam desenhadas em largura ~135–163 CSS px.

## Correções
- Portais: anel fixo `shell.webp` com centro transparente e quadros **somente do núcleo** (`core_XX.webp`); sem `ctx.clip()` por frame. Fallback para estático até imagens carregarem.
- Bases: estrutura estática 512×299 e 12 camadas transparentes de luz extraídas de quadros originais; apenas energia muda, centro não se desloca.
- Relés: base reduzida para 200×240 sem alterar tamanho exibido, hitbox e estados; discos grandes translúcidos dos relés removidos (contorno, escudo, HP e seleção preservados).
- Cache: V71 possui caminhos imutáveis, não recebe query de revisão global.
- Diagnóstico: o botão de copiar relatório agora inclui tempo do último quadro para base, portais e relés.

## Métricas locais (não são FPS)
- 12 quadros de uma base V69: 19.756.800 bytes RGBA decodificados a 840×490.
- 12 camadas de luz V71: 7.348.224 bytes RGBA decodificados a 512×299.
- Redução: aproximadamente 62,8% dessa sequência; a imagem estática é adicional.
- Texturas dos relés: 300×360 → 200×240, redução teórica de pixels de ~55,6% por textura.

## Testes
- `npm run verify` em uma cópia completa montada das versões V64 a V70: 61/61 testes.
- Simular o Instalador Universal no release V70 antes de publicar.
- Os testes não medem FPS real de navegador; necessidade de validar no celular do jogador.

## Como testar no celular
1. Abra mapa 1-8 e aproxime-se da base, sempre com a mesma qualidade e zoom usados no vídeo.
2. Entre em 4-1 e aproxime-se dos relés; faça captura de 60 segundos no Baixo, Médio e Alto.
3. Ative Diagnóstico de Desempenho em Configurações, copie relatório e compare FPS, P95/P99, tempo de desenho e linha VISUAL V71.
4. Confira que cada portal mantém aro estático e núcleo animado e que os 3 modelos de base não 'andam' entre quadros.
5. Se houver regressão, instale o ZIP de rollback V71→V70 ou reverta o commit correspondente.

Sem alterações intencionais de combate, spawn, movimento, sincronização, economia ou banco de dados.
