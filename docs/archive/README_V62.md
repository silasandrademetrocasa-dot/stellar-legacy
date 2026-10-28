# STELLAR LEGACY V62 — FROTA 3D (ZIP CUMULATIVO V55–V62)

Atualização visual única. No GitHub, coloque apenas o ZIP na raiz e execute Actions → Instalador Universal → instalar.

## Modelos reais para Prisma3D
`public/assets/v62/models/SL_AURORA_FINAL.glb`, ... até `SL_BULWARK_FINAL.glb` (13 arquivos).
Importáveis, nariz apontado para +Z, casco para +Y. Nomes correspondem ao Stellar Legacy, não à referência de outro jogo.

## Hangar / Loja
`public/assets/v62/showroom/*.webp`: recortes da prancha conceitual aprovada. A apresentação 2D desses cards preserva o visual rico da referência, enquanto o mapa utiliza os GLBs 3D em tempo real.

## Mapa
Visual 3D LIGADO => usa os modelos novos; AUTOMÁTICO => mantém os LOD anteriores para FPS; DESLIGADO => mantém 2D. Render de 240 px no modo ligado.

## Limite gráfico importante
A prancha é uma imagem 2D. Os modelos GLB são novas esculturas **procedurais inspiradas** nas naves, com cores, motores, cockpit e silhuetas diferentes, mas não reproduzem o nível de textura, reflexos e pormenores da ilustração CGI. O shader do jogo continua simplificado; o acabamento cinematográfico exato exigiria modelagem artística manual, texturas PBR e pipeline de iluminação.

Sem SQL. Sem mudanças nas estatísticas, economia, inventário, combate, bases, AUX, drones ou NPC.
