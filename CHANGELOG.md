# V16.7.4 — X-1 NEUTRAL + PREMIUM POLISH
- Em mapas X-1 os NPCs ficam passivos até serem atacados pelo jogador.
- Ao receber dano, o NPC entra em retaliação e pode perseguir/atacar normalmente.
- Loja Premium compactada e reorganizada; cupom abaixo dos status Premium/Passe.
- Cards Premium menores e uniformes.

# V16.7.3 — MODO DE BATALHA
- HUD slim, clean e bem compacto.
- Menos informação visível no topo para liberar mais área de combate.
- Missões, AUX e Atividades com visual reduzido e leitura rápida.

# V16.7.2 — TOP GRID COMPACT
- Redução de altura e largura dos painéis superiores para liberar mais área útil da tela.
- Grid do topo mantida padronizada com cards mais compactos.

## V16.7.1 — TOP GRID POLISH
- Remove STATUS e UNIVERSO do card JOGADOR.
- Move os indicadores de conexão para CONFIG > JOGO.
- Padroniza a altura de PILOTO, NAVE, MISSÕES, AUX-9 e ATIVIDADES.

## V16.7.0 — HUD DOCK POLISH + EVENT CATALOG
- CHAT fixado no canto inferior esquerdo e MAPA no canto inferior direito com tamanhos equivalentes.
- Campo de digitação do chat preso no rodapé do painel, sem subir quando outros docks são recolhidos.
- Barra de munições mantida centralizada e mais fina, com estados recolhidos padronizados.
- NPCs de evento agora permanecem destacados no minimapa mesmo fora do alcance visual/radar do jogador.
- Novo catálogo de eventos criado em modo inativo (dormant), pronto para ativação manual por semana/mês no Supabase.

## V16.6.0 — HUD / PREMIUM / EVENTS
- Reorganização do HUD inferior: chat à esquerda, munições ao centro, mapa à direita.
- Campo de mensagem do chat fixado no rodapé do painel.
- Conta FELP/ADM recebe desbloqueio administrativo local para naves, equipamentos, drones, AUX e designers.
- Loja Premium agora possui 4 planos: 7, 30, 90 e 180 dias.
- Sistema inicial de cupons implementado com o código `EVENTO7D`.
- Scheduler do shared universe ajustado para rotação semanal: 4h em dias úteis e 1h no sábado/domingo.

# CHANGELOG

## V16.6.0 — FINAL DESIGNERS & SOCIAL

- Release combinada das etapas V16.4 + V16.5.
- Designers de nave: HP, DANO, ESCUDO, XP, CRÍTICO e REPARAÇÃO, exclusivos de naves ELITE/STL e naves especiais de evento.
- Habilidade inferior da tecla E agora representa a habilidade individual do designer de nave ativo; habilidade de classe continua como fallback sem designer.
- Habilidades de designer: OVERDRIVE, SHIELD PULSE, HULL MEND, NANO RESTORE, QUANTUM FOCUS e PRECISION BURST.
- Designers do AUX-9 exclusivos de evento: PREDATOR, BASTION, VITALIS AUX, SAVANT e OMEGA SYMBIOSIS.
- Bônus AUX podem combinar DANO, HP, ESCUDO e XP; OMEGA é o item mítico híbrido.
- Drops de evento são sorteados pelo Supabase, idempotentes por jogador/ciclo e controlados por `live_drop_rules_v16`.
- Designer de nave/AUX é sincronizado pelo Shared Universe para os outros jogadores enxergarem o visual equipado.
- Minimapa social: COMPANHIA em verde, ALIANÇA em dourado, HOSTIL em vermelho e alvo selecionado em amarelo.
- Legenda social adicionada ao MAPA e acabamento visual por raridade nos painéis de designers.
- Supabase V16.5 aplicado diretamente no projeto; nenhuma execução manual de SQL é necessária.

## V16.2.0 — CHAT DOCK
- Chat persistente GLOBAL / ALIANÇA / PV via Supabase RPC.
- Dock inferior fluido CHAT | MUNIÇÕES | MAPA, com reflow automático ao esconder ou recolher painéis.
- Chat minimizável, estado persistido e opção de visibilidade no HUD.
- PV por callsign único e histórico privado restrito aos dois participantes.
- Limite de 240 caracteres e rate-limit server-side já aplicado no banco.
- Polling leve de chat sem interferir no Shared Universe/WebSocket de combate.

# V16.1.0 — ETAPA 2 — ECONOMY GUARD

- AUTO BUY de laser/míssil passou a comprar pelo Render com preço do Supabase.
- Trader agora vende recursos pelo servidor usando `live_shop_prices_v16`.
- Venda de equipamentos e drones passou a ser validada no servidor.
- Slots do AUX-9 agora são liberados pelo servidor.
- Compra/conversão de Núcleos Quânticos agora passa pelo servidor.
- Materializador/Galaxy Gate agora cobra, sorteia e entrega recompensas no servidor.
- Fila de mutações econômicas reduz double-spend e corrida entre ações simultâneas.
- Nenhum SQL novo obrigatório nesta etapa.

# V16.0.0 — ETAPA 1 — LIVE OPS CORE

- Eventos online migrados para agenda do Supabase.
- Catálogo/preços carregados de `live_shop_prices_v16`.
- Compras da Loja principal validadas e aplicadas pelo Render.
- Trader recebe preços online.
- Nenhum evento local é criado quando o banco não possui janela ativa.

# V15.2.0 — TACTICAL HUD + AGGRO LOCK

- Target Lock e Evento Galáctico ganharam modo minimizado persistente.
- NPCs do Shared Universe agora travam o primeiro atacante como alvo de aggro.
- Portal mantém neutralidade para quem não iniciou combate; ao atacar um NPC dentro da zona neutra, o NPC pode perseguir e causar dano normalmente.
- A base X-1 continua protegida.
- Feedback do HUD indica quando o portal está em COMBATE ATIVO.
- Sem SQL novo.

# V15.1.0 — REALTIME COMBAT PRESENCE

- Movimento dos jogadores no mesmo mapa migrou para atualização WebSocket de baixa latência, mantendo Supabase como fallback/metadata.
- Frequência do estado do jogador aumentada e mudanças de combate são enviadas imediatamente.
- Lasers de outros jogadores agora aparecem no mapa com a cor real da munição PLS/SIP em uso e etiqueta discreta da munição.
- AUX-9 dos outros jogadores agora é visível, com posição, direção, nível, modo e feixe de laser sincronizados.
- Movimento remoto recebeu interpolação + pequena predição para reduzir sensação de atraso sem teleporte.
- NPCs compartilhados agora usam tick de 20 Hz, broadcast de 10 Hz e interpolação no cliente.
- WebSocket desabilita compressão de pacotes pequenos, ativa TCP no-delay quando disponível e reconecta mais rápido.
- Polling de presença do Supabase fica mais lento quando o Shared Universe está saudável, evitando sobrescrever posições realtime com dados antigos.
- Sem migration SQL nova.

# V15.0.0 — SHARED UNIVERSE

- Novo World Server autoritativo via WebSocket no Render.
- NPCs, HP, escudo, movimento, morte e respawn compartilhados para todos no mesmo mapa.
- Minérios/pedras compartilhados: uma coleta remove a entidade para todos e o respawn é global.
- Eventos Galácticos passam a usar relógio e entidades do servidor, incluindo Invasão, Prime, Mineração, Comboio e Warfront.
- Dano PVE passa pelo servidor e registra contribuição por jogador.
- Assistências recebem crédito proporcional, deixando a fundação pronta para Grupos de Batalha.
- Ataques de NPC passam a ser coordenados pelo servidor.
- Reconexão segura: sem fallback para spawns locais durante queda de WebSocket.
- HUD ganhou estado do UNIVERSO + latência.
- Portais Astrais continuam instâncias privadas.
- V14.1 Account Guard e benefícios PREMIUM preservados.
- Sem novo SQL obrigatório.

# V14.1.0 — ACCOUNT GUARD + PREMIUM AUTO-COMBAT

- Login automático removido: cada entrada/reload exige login explícito.
- Tokens não ficam mais persistidos em localStorage; sessão fica somente na aba durante o uso.
- Save ganhou vínculo por `accountOwnerId`; cliente e servidor bloqueiam mistura entre contas.
- Callsign deixou de ser aceito do save: a identidade pública vem do perfil autenticado do servidor.
- Login não sobrescreve mais callsign do perfil com metadata antigo.
- Renome de callsign passa por endpoint autenticado e valida duplicidade.
- SQL V14.1 adiciona unicidade case-insensitive para callsigns e RPC segura de disponibilidade.
- AUTO-COMBATE (selecionar próximo NPC e continuar laser) agora é benefício exclusivo de PREMIUM 30D ou PASSE MENSAL.
- Segundo toque para atacar continua disponível a todos por ser comando manual.

# V14.0.0 — EPIC COMBAT & GALAXY EVENTS

- Novo Target Lock HUD para NPC, BOSS e PvP.
- Críticos, damage feedback, alertas táticos e efeitos de habilidade aprimorados.
- Boss HUD detalhado e minimapa com lock reforçado.
- Auto-target e segundo toque para atacar configuráveis.
- Event Director com Invasão, BOSS raro, mineração, comboio e Ruptura Warfront.
- Mapas 4-1/4-2/4-3 passam a abrir por evento/World Boss.
- World Boss Warfront integrado ao sistema de eventos coletivos.
- Sem novo SQL obrigatório.

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
