# Stellar Legacy V17.6.1 — Environment Asset Loading Hotfix

Hotfix do revamp de cenário: força atualização dos assets no navegador/CDN, mantém fundos visíveis no modo LOW e integra base, recursos e portais ao preload ativo sem alterar naves/NPCs/AUX/drones.

# Stellar Legacy V17.5.1 — Event Cleanup Hotfix

Visual pass focado em NPCs e bosses, preservando gameplay e o Performance Pass da V17.4.

# Stellar Legacy V17.4.0 — Performance + Mobile Pass

A V17.4 reduz download e consumo de memória/GPU, adiciona qualidade AUTO adaptativa e melhora o uso em celulares sem alterar gameplay. Veja `PERFORMANCE_V17_4.md`.

## V16.7.8 — AUX EQUIPMENT + SHIELD SUPPORT
- Corrigida a aba de equipamentos do AUX-9 no Hangar.
- Escudos equipados no AUX-9 agora somam escudo à nave como suporte, igual aos drones.
- Absorção e regeneração dos geradores do AUX entram nas estatísticas da nave.

## V16.7.7 — AGGRO + PORTAL REWARDS + REALTIME MATERIALIZER
- Perseguição normal limitada a 800u e ataque até 500u.
- NPCs de evento deixam de perseguir o jogador através do mapa inteiro.
- Pacotes finais dos Portais Astrais fortemente melhorados.
- Materializador atualiza ganhos e peças imediatamente após os giros.

## V16.7.6 — PORTAL REFORGE
- AURORA, NEXUS e ECLIPSE liberados desde o início.
- Rounds e ondas refeitos para progressão estratégica e viável para jogador FREE com itens de Créditos.
- Sistema de vidas: 3 vidas base, até 5 com compra em Créditos ou Vida Astral Reserva.
- Materializador troca o drop de reparo por Vida Astral Reserva.
- Recompensa por Round + pacote final garantido com CR, STL, Núcleos, munição, míssil e Voidite.
- Botão de reparar removido da tela do Portal.

# V16.7.5 — AUCTION / AUTO-COMBATE / X-1 / AUX-9
- Nova removido do leilão quando o piloto já possui 8 drones.
- AUTO-COMBATE escolhe somente o NPC mais próximo dentro do alcance laser e visível na tela.
- NPCs do X-1 perseguem de forma passiva, mas só atacam depois de receber dano.
- AUX-9 acompanha a velocidade real da nave e ganha aceleração curta para recuperar distância.
- Progressão AUX-9 adaptada para 20 níveis com capacidade de slots e bônus por nível, sem combustível.

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

# Stellar Legacy V16.7.0 — HUD DOCK POLISH + EVENT CATALOG

Patch focado em acabamento do HUD inferior e preparação do calendário de eventos. O chat fica travado no rodapé esquerdo, o mapa no rodapé direito e a barra de munições permanece centralizada sem empurrar os docks laterais. NPCs de evento agora aparecem destacados no minimapa mesmo quando estão fora do alcance visual normal.

## Catálogo de eventos (sem ativação automática nova)
- Eventos atuais continuam como estão no Supabase.
- O arquivo `sql/V16_6_EVENT_CATALOG_DORMANT.sql` adiciona o catálogo expandido em modo `enabled = false`, para você escolher depois por mês/semana.
- A lista humana de eventos está em `EVENT_CATALOG_V16_6.md`.

# Stellar Legacy V16.6.0 — HUD / PREMIUM / EVENTS

Esta release junta as duas últimas etapas da V16: **SHIP + AUX DESIGNERS** e **VISUAL & SOCIAL FINAL**. O sistema de designers fica conectado ao Supabase, com drops de evento, habilidade individual da nave, bônus de atributos e visual sincronizado no Shared Universe.

## Designers de nave
Os designs REAPER, BULWARK, VITALIS, RECLAIMER, SCHOLAR e APEX cobrem DANO, ESCUDO, HP, REPARAÇÃO, XP e CRÍTICO. Eles só podem ser usados em naves ELITE (STL) ou ESPECIAIS DE EVENTO. A tecla **E** passa a usar a habilidade do designer ativo; sem designer, a habilidade de classe continua funcionando.

## Designers AUX-9
PREDATOR, BASTION, VITALIS AUX, SAVANT e OMEGA SYMBIOSIS são exclusivos de eventos. Os bônus podem afetar dano do AUX, HP/escudo como suporte e XP. O OMEGA é o drop mítico híbrido.

## Social final
O radar agora mostra aliados da mesma companhia e membros da mesma aliança além dos hostis. Designs de nave e AUX também são enviados pelo WebSocket, permitindo que outros jogadores enxerguem o visual raro equipado em tempo real.

## Segurança operacional
Agenda de eventos, preços, catálogo de designers e probabilidades de drop continuam no Supabase. O claim de designers de evento é validado por RPC autenticada, confere a janela oficial do evento e aceita apenas uma tentativa por jogador em cada ciclo.

---

# Stellar Legacy V16.0.0 — LIVE OPS CORE (ETAPA 1)

Esta versão inicia a migração operacional para o Supabase em etapas. Eventos e preços deixam de ser definidos pelo cliente nos mapas online, e as compras principais passam por validação no servidor.

# Stellar Legacy V15.2.0 — TACTICAL HUD + AGGRO LOCK

## V15.2 — TACTICAL HUD + AGGRO LOCK

- Target Lock e Evento Galáctico recolhíveis.
- Aggro PVE autoritativo: o primeiro jogador que acerta o NPC vira o alvo prioritário.
- Portal neutro protege apenas enquanto o jogador não inicia combate contra o NPC.
- Base continua totalmente segura.


A V15 transforma os mapas principais em um universo realmente compartilhado. Jogadores na mesma sala veem os mesmos NPCs, os mesmos minérios, os mesmos eventos e o mesmo estado de combate PVE. O Render mantém o World Server em tempo real por WebSocket e o Supabase continua como camada persistente de conta e progresso.

## V15.0 — pontos principais
- World Server autoritativo em `server/world.js`.
- Cliente realtime em `public/world.js`.
- Salas por território/mapa: Terra/Marte/Júpiter X-1..X-4 e salas BATTLE 4-1..4-3.
- NPCs compartilhados com movimento, HP, escudo, morte, respawn e ataque coordenados.
- Recursos compartilhados com coleta exclusiva e respawn global.
- Eventos Galácticos sincronizados por relógio do servidor.
- Contribuição de dano por jogador e assistência proporcional.
- Base pronta para Party/Grupo de Batalha sem reconstruir o motor PVE.
- Galaxy Gate/AURORA continua privado por jogador.
- Se o realtime cair, o cliente congela o mundo em vez de inventar uma cópia local.

## Deploy
1. Suba o ZIP completo pelo instalador atual.
2. O Render executará `npm install` e instalará também a dependência `ws`.
3. Não há SQL novo obrigatório na V15.
4. Após o deploy, `/health` deve informar V15.2.0 e `/api/world/status` mostra salas, clientes, NPCs e minérios ativos.

## Teste recomendado com duas contas
Abra duas janelas, entre no mesmo mapa/território e valide: selecionar o mesmo NPC, observar HP caindo nas duas telas, matar em conjunto, coletar a mesma pedra e confirmar que ela desaparece nas duas janelas. Em seguida valide um Evento Galáctico e o status UNIVERSO/ping no painel JOGADOR.

---

# Stellar Legacy V14.1.0 — HUD DOCK SYSTEM

# Stellar Legacy V13.5.0 — Clean UI + AUX-9 + Combat Audio

Atualização de interface aplicada sobre a base V13.1.0 WARFRONT, preservando as mecânicas e o backend existentes.

## Principais mudanças
- Barra superior mais fina, sem a logo grande.
- NAVE, MISSÕES, AUX-9, PORTAIS e HABILIDADES organizados no topo.
- Habilidades rápidas da nave/AUX-9 integradas à barra superior.
- Textos visuais LASER CTRL, MÍSSIL ESPAÇO e MÍSSIL PRONTO removidos da barra de munição; os atalhos continuam funcionando.
- Navegação de menus em modo exclusivo: abrir um menu principal fecha o anterior.
- Portal Astral AURORA disponível; NEXUS e ECLIPSE continuam visíveis, porém bloqueados como EM BREVE.
- Compatível com os saves e o backend da V13.1.0.

## Instalação
1. Suba os arquivos desta pasta no Git/Render.
2. Execute `sql/V13_3_STELLAR_IDENTITY.sql` se estiver instalando esta versão em outro banco; no projeto principal o ajuste de identidade já foi aplicado.
3. Confirme `SUPABASE_URL` e `SUPABASE_PUBLISHABLE_KEY` no Render.
4. Faça o deploy/restart do serviço.

## Controles preservados
- `CTRL`: laser
- `ESPAÇO`: míssil
- `E`: habilidade da nave
- `K`: Nova Burst do AUX-9
- `W`: WARFRONT
## V14.1.0 — HUD DOCK SYSTEM

- Sequência do HUD: JOGADOR → NAVE → MISSÕES → AUX-9.
- Topbar pode ser escondida sem deixar vão; cards sobem automaticamente.
- Munições e mapa ficam dockados no rodapé, lado a lado.
- Munição recolhida mantém OVERDRIVE e KAMIKAZE visíveis.
- Estados de recolhimento são persistidos no navegador.

## V13.5.0

- Interface limpa de textos de teste, versões e instruções internas.
- AUX-9 com papéis exclusivos por módulo, sem misturar combate e coleta.
- Áudio procedural de combate e animações com controle de volume.
- Perfil de Piloto atualiza imediatamente após compras e upgrades.


## V14.1.0
Epic Combat & Galaxy Events: Target Lock, feedback de dano, eventos rotativos, comboio e Battle Maps por evento.


## V14.1 ACCOUNT GUARD
Antes de liberar novos cadastros/renomes, execute `sql/V14_1_ACCOUNT_GUARD.sql` uma vez no Supabase. O jogo passa a exigir login manual, vincula saves à conta autenticada e bloqueia callsigns duplicados. AUTO-COMBATE é exclusivo para PREMIUM 30D ou PASSE MENSAL.


## V15.1 — Realtime Combat Presence
- Players: posição/ângulo/HP/escudo via WebSocket (~13 Hz).
- NPCs: servidor 20 Hz, broadcast 10 Hz, interpolação cliente.
- Laser remoto: cor + munição usada.
- AUX-9 remoto: posição, modo, nível e disparo visíveis.
- Supabase continua como persistência e fallback, não como transporte primário de movimento.