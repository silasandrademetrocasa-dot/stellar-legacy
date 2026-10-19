# Stellar Legacy V22.12.1 — Naves top-down (ZIP COMPLETO)

Este ZIP contém o repositório COMPLETO em sua raiz, sem pasta intermediária, sem script para aplicar patch.

## Como subir
1. Extraia o ZIP.
2. No GitHub, substitua os arquivos correspondentes no repositório mantendo as mesmas pastas e caminhos. Não envie o ZIP como um único arquivo sem extrair.
3. Aguarde o build e o deploy no Render; teste no celular, dando refresh no navegador.

## O que mudou
- Sprites do mapa das 3 naves iniciais por facção voltam à visão superior 2D ortográfica, usando assets que já estavam no projeto.
- 22 tipos de NPC usam visual do mapa top-down, apontando corretamente na direção do alvo e sem distorção das escalas X/Y.
- Designs 3D de cards e retratos de NPC são mantidos.
- Nenhum SQL novo.

## Verificação
Executar `npm run verify`. Não requer migração SQL.

## Observação
A alteração é puramente visual, não representa um conjunto novo de 16 sprites prerenderizados por nave. O próprio Canvas gira o desenho superior 360°.
