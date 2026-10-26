# Guia técnico — Mapas modulares V2

## Arquitetura
- `public/assets/mapas/Biblioteca_Geral`: 84 PNGs originais e 8 fundos WEBP otimizados (compartilhados).
- `public/assets/mapas/{Terra,Marte,Jupiter,PvP,Universo}/Mapa_*/layout.json`: 30 manifestos, uma seed imutável por mapa.
- `.../Fundo/fundo.png`: textura local compacta (540x540) para gráficos baixos; os fundos maiores pertencem à biblioteca.
- `public/modules/modular-map-v2.js`: seleção de mapa por facção + tier, carregamento sob demanda de um manifesto de cada vez, composição determinística, limite de draw calls visíveis, parallax baseado apenas na câmera.
- `public/game.js`: usa a cena modular antes das entidades e mantém o renderizador antigo como fallback, sem alterar motor de movimentação.

## Convenção do layout.json
`mapId`, `faction`, `seed`, `background` (`low`, `medium`, `high`, `original`), `objects`, `stars`, `celestialBodies`, `nebulas`, `parallax`, `qualityOverrides`. Objetos têm sprite, x/y normalizados, escala, rotação, opacidade, profundidade e fator de parallax.

## Qualidade
- **Baixa:** somente `Fundo/fundo.png` por mapa. Composição sem overlays.
- **Média:** metade determinística de estrelas/asteroides/fragmentos + até um corpo celeste + até uma nébula leve.
- **Alta:** todas as camadas decorativas. A troca de qualidade não altera a seed nem gera novos objetos.

## Atualização futura
1. Colocar novos arquivos independentes em `Biblioteca_Geral` e entradas no catálogo. Jamais mascarar composição contaminada como sprite limpo.
2. Editar o manifesto do mapa desejado mantendo `seed` e campos. Objetos novos usam `id` estável.
3. Atualizar `package.json`, `server/index.js`, imports do `game.js` e recursos de HTML para a mesma versão do release.
4. Acrescentar testes; executar `npm run verify` em um repositório completo antes de instalar.
5. Não usar `layout.json` para escrever regras de física, rotas ou balanceamento no Supabase.

## Pendências de arte / validação
- 8 fundos para 30 mapas: fundos compartilhados; não existem 30 fundos autorais exclusivos neste ZIP.
- U-1 e U-3 usam o fundo de Universo violeta até receberem fundos frios/emeraldinos exclusivos.
- Categorias `Meteoros` e `Efeitos` vieram sem PNGs; pastas preparadas vazias.
- Fundos originais possuem detalhes da ilustração já integrados; cenário em Baixo não é um céu liso.
- Testes automatizados não substituem validação de FPS real e visibilidade em aparelhos Android antigos.
