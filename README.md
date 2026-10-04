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