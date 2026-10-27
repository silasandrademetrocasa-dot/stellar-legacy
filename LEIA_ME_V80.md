# Stellar Legacy V80 — Mundo estático e mapas variados

**Base:** 47.7.35 (V79). **Destino:** 47.7.36 (V80).

- 6 portais usam somente `static.webp`, sem solicitar ou alternar frames de núcleo.
- 3 bases usam somente `static.webp`, sem buscar sequências de iluminação.
- Relés já utilizam textura imóvel `base.webp` com renderizador protegido V76/V77; mantido círculo de captura e indicadores.
- 30 mapas com fundos visuais próprios (inclusive três universos novos U-1, U-2, U-3); a configuração de mapa e seleção das imagens continua determinística.
- Sprites de caixas de reparo, mistério, munição e cargo recortados para remover fragmentos do atlas.
- Sem mudanças de mecânica, posição, economia, rede ou salvamentos.
- Apenas carregamento visual: imagens WebP de fundo com qualidade econômica no Baixo.

**Nota de desempenho:** os testes automatizados verificam integridade e caminhos de imagem, não FPS em celular. Testar mesmas cenas em Baixo/Médio/Alto e conferir os três universos.
