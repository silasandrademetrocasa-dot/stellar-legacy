# V52.6 — direção e legibilidade (visual apenas)

- 3D: corrigida orientação angular espelhada no módulo WebGL2 (leste/direita 0, sul/baixo +90°, oeste/esquerda 180°, norte/cima 270°).
- Normalização automática de enquadramento para GLBs menores (NPCs comuns, minérios e caixas) mantendo escala original de naves e bosses.
- NPCs comuns do X-1, X-2 e outros mapas: ampliação visual em 2D e 3D; bosses mantêm dimensão anterior.
- Minérios: tamanho aumentado em 2D/3D, sem mudanças nas quantidades ou economia.
- Boxes e loot: tamanho visual ampliado em 2D/3D.
- Indicadores do alvo, barra de HP/Escudo e nome acompanham o tamanho do sprite.
- Cache-busting da versão técnica 47.7.8 para carregar assets e scripts corretos no Android.
- Não há SQL e não houve mudança de alcance, hitbox, dano, movimento, missões, propriedade nem progressão.
- Configurações globais 2D/3D existentes preservadas.
- 2D: fallback dos NPCs alinhado à mesma convenção de rotação dos modelos 3D.
