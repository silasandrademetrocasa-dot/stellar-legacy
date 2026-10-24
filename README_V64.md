# Stellar Legacy V64 — Limpeza visual de frota + AUX-9 + Drones

## Aplicado nesta versão
- Removidas referências visuais antigas dos **drones** e do **AUX-9** nas rotas principais de UI e mapa.
- Criados novos sprites **2D em perspectiva** derivados dos GLBs para:
  - `drone_common`
  - `drone_elite`
  - `drone_a`
  - `drone_b`
  - `drone_c`
  - `drone_d`
  - `drone_e`
  - `aux9`
- Criados novos atlases **16 direções** para mapa:
  - `*_16.webp` em `public/assets/v64/drones/`
  - `aux9_16.webp` em `public/assets/v64/aux/`
- Hangar/loja/workstation ajustados para usar a nova arte, com **remoção de sombras/argolas decorativas** e sem a antiga forma sobreposta.
- Cache de assets ajustado para manter as novas artes `v63/v64` como assets principais.

## Arquivos principais alterados
- `public/game.js`
- `public/style.css`
- `public/modules/stellar-fleet-v62.css`
- `public/modules/stellar-premium-ui-v55.css`
- `public/modules/asset-cache.js`
- `public/assets/v64/drones/*`
- `public/assets/v64/aux/*`

## Observação
- Mantidas as cores-base dos modelos e o foco em qualidade visual.
- Não foi aplicada redução agressiva de peso visual nos GLBs, preservando a leitura aprovada.
