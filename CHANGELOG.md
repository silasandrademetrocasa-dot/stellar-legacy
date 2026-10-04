# V13.7.0 — HUD DOCK SYSTEM

- HUD superior reorganizado na sequência JOGADOR → NAVE → MISSÕES → AUX-9.
- Painéis superiores agora vivem em um dock flexível: recolher ou esconder um bloco não deixa espaços fantasmas.
- Barra de comandos superior ganhou controle independente para esconder/mostrar; ao esconder, o HUD principal sobe e gruda no topo.
- MISSÕES ATIVAS e AUX-9 ganharam recolhimento próprio e persistente.
- Barra inferior virou dock real: MUNIÇÕES no canto inferior esquerdo e MAPA no canto inferior direito, lado a lado e sem sobreposição.
- Ao recolher MUNIÇÕES, permanecem visíveis apenas OVERDRIVE e KAMIKAZE, além do botão de reabrir.
- Layout agora recalcula offsets usando as dimensões reais dos docks, inclusive após recolher painéis, mudar visibilidade e redimensionar a tela.
- Corrigido carregamento do estado recolhido do painel JOGADOR, que existia mas não era restaurado no boot.
- Sem alteração de schema/SQL e sem mudança nas mecânicas de combate, missões, clã ou economia.

# V13.6.0 — Command Groups + Pilot HUD + Clan Tabs

- Barra superior reorganizada em grupos: PILOTO, MISSÕES, BATALHA e LOJAS.
- PILOTO reúne Hangar, Nave, Habilidades e AUX-9.
- MISSÕES reúne Missões e Passe.
- BATALHA reúne Arena, Warfront e Portais.
- LOJAS reúne Loja e Loja Premium.
- Overdrive e Kamikaze movidos para a barra inferior junto das funções de combate.
- Informações do piloto saíram do topo e ganharam painel próprio, recolhível e controlável nas Configurações do HUD.
- Login reorganizado para caber na tela, sem textos internos, com recuperação de senha por e-mail.
- Clã dividido em Visão Geral, Membros, Cofre e Missões.
- Quantidade de membros não bloqueia mais evolução do clã: somente XP + Cofre + Missão NPC.
- Removidos textos explicativos internos do painel de clã e painel de missões.
- Mantidas as correções V13.5: AUX-9 exclusivo por módulo, áudio de combate e refresh imediato do Perfil de Piloto.

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
