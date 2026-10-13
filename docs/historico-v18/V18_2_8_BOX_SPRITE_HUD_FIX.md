# Stellar Legacy V18.2.8 — BOX Sprite & Ship HUD Fix

## Problema 1 — BOX quadrada no mapa
O sprite WebP existia, mas `requestAssetImage` usava `img.loading='lazy'` para imagens secundárias. Ao desenhar num `<canvas>` com `new Image()` desconectada do DOM, o navegador pode nunca buscar o asset. Assim a BOX ficava no fallback azul chapado mostrado na captura.

### Correção
- Carregamento de imagens solicitadas sempre `eager`; `fetchPriority` permanece `low` para itens secundários, não carregando desnecessariamente todos os assets.
- BOX e Poeira entram no cache protegido e a revisão de URL da pasta bônus vira `18.2.8` apenas nessa pasta.
- Fallback temporário passa a ser uma caixinha sci-fi geométrica, nunca um quadrado azul.

## Problema 2 — HP/ESC não ficam visíveis com o painel NAVE fechado
- Adicionada `drawLocalShipVitals(p,shipSize)` para HP vermelho e escudo ciano, acima da nave, da mesma família visual das barras dos NPCs.
- Barras usam `player.hp/player.maxHp` e `player.shield/player.maxShield` em tempo real, funcionam inclusive no modo BAIXO e em todos os mapas.
- Não foram adicionados elementos DOM nem cálculos pesados.

## Validação
`node --check public/game.js`, `node --check server/index.js`, `node tests/test-bonus-sprite-vitals-v1828.mjs`.

## Instalação
ZIP completo via instalador do GitHub; **não há SQL**. Versão preserva dados e modos V18.2.7.
