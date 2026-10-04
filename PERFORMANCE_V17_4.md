# Stellar Legacy V17.4 — Performance + Mobile Pass

## Modo AUTO
O cliente detecta dispositivo móvel, memória aproximada, número de threads, economia de dados e preferência de redução de movimento. O perfil inicial é escolhido automaticamente e pode mudar durante a sessão se o FPS real cair de forma consistente.

## Download e memória
Os assets V17 foram convertidos para WebP transparente. O boot não baixa mais todo o catálogo visual; naves, drones e equipamentos entram sob demanda. O cache de imagens também passa a ter limite por perfil de qualidade.

## Perfis
- ALTA: 60 FPS, DPR até 2.0, FX completos e maior cache visual.
- MÉDIA: 45 FPS, DPR 1.30 e partículas reduzidas.
- BAIXA: 30 FPS, DPR 0.95, fundo/FX pesados reduzidos e cache mínimo.

## Mobile Pass
Em dispositivos móveis o cliente remove blur pesado dos HUDs/modais, reduz sombras, compacta menus e respeita `prefers-reduced-motion`.

Nenhuma regra de combate, save, economia ou backend foi alterada nesta versão.
