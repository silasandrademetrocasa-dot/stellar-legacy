# Stellar Legacy — Visual Revolution Completa (34.7.1)

Consolidação das fases 7.1 a 7.5 sobre a versão 34.7.0, sem instalação intermediária.

## Fase 7.1 — Naves e NPCs
- Preserva sprites top-down e orientações existentes.
- Propulsores leves em qualidade baixa, pontos de luz nas asas de naves locais/remotas em média/alta.
- Mantém interpolação de pilotos online, NPCs e indicadores de bosses.

## Fase 7.2 — Relés evoluídos
- Nova representação vetorial dos nove relés com 8 encaixes, contornos de casco, núcleo e componentes.
- Laser distinto de lançador de mísseis; armadura, nanobots, capacitor e regenerador com símbolos próprios.
- Relés neutros exibem armamento virtual LV1; equipamentos de clã são exibidos do banco sem criação de itens.
- Dano estrutural, núcleo destruído e defesas visuais por porcentagens reais do servidor.

## Fase 7.3 — Combate visual
- Tiros de torretas do relé para a nave com projéteis de Laser e Mísseis distintos, criados só a partir de eventos do servidor.
- Impactos e explosões locais em resultado confirmado; sem dano fictício ou repetição de recompensa.
- Efeitos de qualidade baixa simplificados, sem sombras nem gradientes.

## Fase 7.4 — Universo, portais e mineração
- Anéis segmentados em portais no médio/alto; rotação quantizada para limitar custo de renderização.
- Marcação discreta para minérios especiais em desktops de alta qualidade.
- Render de comboio otimizado para reduzir sombras no gráfico baixo.

## Fase 7.5 — Otimização e regressão
- HUD de munições só atualiza contadores alterados, recolhido não pinta, ícones de munição respondem imediatamente (fase 1).
- Módulo gráfico isolado, com perfil de orçamento de FX e proteção de canvas.
- Correção da edição ADM de módulos HP e escudo para bônus de até +3.000.000, consistente com SQL já implantado.
- Não modifica dano, preços, HP/escudo, economia, eventos, PvP, saves ou estatísticas.

### Instalação
Subir somente este ZIP completo ao instalador universal do GitHub e aguardar Render.
O ZIP exclui `.github`, `.git` e `node_modules`. Não precisa executar SQL.
Nenhum deploy ou alteração de produção foi realizado durante a preparação.
Teste FPS com munições aberta/recolhida, duas contas, relés A/B/C, batalha de mísseis e portais.
