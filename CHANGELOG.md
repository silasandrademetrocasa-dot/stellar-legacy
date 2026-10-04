# V13.5.0 — Clean UI + AUX-9 Exclusive Roles + Combat Audio

- Perfil de Piloto atualiza imediatamente após compra de Núcleos, conversão de PP e evolução de habilidade.
- Confirmações restauram o modal anterior antes do re-render, eliminando tela congelada/desatualizada.
- AUX-9 agora obedece função exclusiva por módulo: Sentinela combate; Salvager caixas; Minerador minérios; Reclaimer reparo; Nova Burst ataque explosivo; Companhia apenas acompanha.
- Removidos textos de teste, versão, instruções internas e recados de desenvolvimento da interface do jogador.
- Adicionado sistema de áudio procedural para laser, AUX-9, mísseis, impactos, escudo, explosões, coleta, portais, habilidades e recompensas.
- Adicionadas opções de áudio e volume em Configurações.

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
