# V13.3.1 — PILOT LIVE REFRESH

- Corrige atualização atrasada do Perfil de Piloto durante confirmações.
- `refreshPilotViews()` agora reconstrói a aba PILOTO mesmo quando o Hangar está temporariamente oculto pelo modal de confirmação.
- Comprar Núcleos Quânticos, evoluir habilidades e resetar a árvore refletem imediatamente no painel ao confirmar.
- Atualizado cache-busting para 13.3.1.

# V13.3.0 — STELLAR IDENTITY
- Rebranding completo da nomenclatura herdada.
- Naves, NPCs, armas, escudos, motores, munições, mísseis, drones e recursos com identidade Stellar Legacy.
- Stellarium (STL), AUX-9, Portais Astrais e Núcleos Quânticos.
- Compatibilidade total com saves por IDs internos legados.
- Blueprint Render renomeado para `stellar-legacy`.

# Stellar Legacy V13.2.1 — TOPBAR CLEAN

## Interface
- Barra de comando superior reduzida para um layout mais fino e horizontal.
- Logo removida do HUD principal.
- Botões NAVE, MISSÕES, AUX-9, PORTAIS e HABILIDADES reposicionados no topo.
- Habilidades ativas movidas do painel flutuante para a barra superior.
- Removidos da interface os textos LASER CTRL, MÍSSIL ESPAÇO e MÍSSIL PRONTO.

## Navegação
- Menus principais agora são exclusivos: ao abrir outro, o anterior fecha automaticamente.

## Portais Astrais
- AURORA permanece funcional.
- NEXUS e ECLIPSE permanecem visíveis, mas bloqueados como conteúdo futuro.

## Compatibilidade
- Base: V13.1.0 WARFRONT.
- Sem alteração de schema/SQL neste patch.
- Saves e backend V13.1 permanecem compatíveis.
