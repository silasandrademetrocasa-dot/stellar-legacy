## 17.9.4 — Global Battle Group Search
- Grupo de Batalha agora busca pilotos globalmente por callsign, sem depender de mapa, facção ou presença online.
- Convites passam a usar o UUID real da conta, evitando falhas por formatação do callsign.

## V17.9.4 — NPC Ownership + Cross-Faction Battle Groups

- Grupo de Batalha aceita pilotos de qualquer facção.
- Membros do mesmo grupo são tratados como aliados para leitura tática/PVP.
- Primeiro ataque efetivo marca o NPC para aquele piloto/grupo.
- NPC marcado aparece com arco colorido para o dono/grupo e branco para terceiros.
- Fora do grupo, terceiros podem ajudar no dano, mas não recebem CR/STL/XP nem box.
- No mesmo setor/instância, CR/STL/XP são divididos igualmente apenas entre membros do grupo ativos.
- Membro ativo = causou dano em algum NPC nos últimos 120 segundos e está vivo no setor.
- Box de carga e drop raro pertencem somente ao primeiro piloto que marcou o NPC.
- Regras de propriedade e divisão são validadas no servidor do Shared Universe.

## V17.9.1 — ADM Analytics + Pilot Titles

- Dashboard ADM com CR/h, STL/h, XP/h, sinks de moeda e atividade em 24h.
- Marcos de nível agora mostram mediana, média e P90 de tempo.
- Jogadores recebem leitura de ritmo NORMAL / RÁPIDO / LENTO conforme telemetria.
- Detalhe individual mostra economia por origem, gastos e marcos de progressão.
- Perfil de Títulos ganhou progresso visual e requisitos quantitativos.
- Mantém as correções críticas de bootstrap/world da V17.7.6.


## V17.9.1 — Bootstrap Recovery + World Restore
- Corrige regressão onde o HUD aparecia com HP 1/1, mapa sem NPCs e sem usuários antes do bootstrap terminar.
- Save + stats + mapa + Shared Universe sobem antes de Premium/LIVE OPS/Designers.
- Serviços secundários agora sincronizam em background e não bloqueiam gameplay.
- Posição autoritativa usa rota same-origin no servidor e timeout de bootstrap.
- Se o checkpoint dedicado chegar atrasado, ele só é aplicado enquanto o jogador ainda não moveu a nave.
- Watchdog de Shared Universe/presença tenta reconectar sem travar o cliente.
- Nenhuma nova remoção SQL nesta versão; a correção é exclusivamente de bootstrap/runtime.
## 17.9.1 — Position Root Fix + SQL Cleanup
- Persistência de posição simplificada: `player_location_v1774` + checkpoint local são as únicas fontes de spawn; `player_presence` deixa de decidir diretamente onde o jogador nasce.
- `player_presence` agora espelha automaticamente a posição real para `player_location_v1774` via trigger no Supabase.
- Posição final é confirmada ao terminar um deslocamento e periodicamente durante movimento.
- Spawn/fallback de base não é promovido para checkpoint definitivo sem checkpoint válido ou movimento real do jogador.
- Respostas da economia preservam mapa/X/Y atuais em vez de substituir localização com snapshot econômico antigo.
- Presença online volta a ser efêmera e é removida no logout/pagehide.
- SQL: removidas 9 tabelas legadas/temporárias que não participavam mais do runtime.
- Pasta `sql/` do release foi reduzida às referências atuais.

## 17.7.1 — Player Telemetry + Titles
- Reset total de conta continua exclusivo do painel ADM; o reset administrativo também limpa a telemetria para iniciar testes de progressão do zero.
- Telemetria registra tempo jogado, sessões, níveis alcançados, kills, boxes, mineração, missões, mortes, saltos e geração/gasto de CR/STL/XP.
- Fontes econômicas separadas em NPC, missões, recursos, passe/nível, eventos, portais, exploração e outros.
- Painel ADM ganhou visão de economia global, CR/h, STL/h, XP/h, tempo médio até níveis-chave e detalhe individual por jogador.
- Sistema de títulos com perfil próprio no Hangar e títulos liberados por nível/conquistas.
- Abaixo do callsign no mapa aparece apenas o título equipado; patente permanece representada pelo emblema e o nível deixa de ser exposto visualmente.
- Título sincronizado no Presence/Shared Universe para outros jogadores.


## 17.7.0 — Progression & Economy Rebalance
- Nova curva de XP com migração que preserva nível/progresso relativo de contas existentes.
- NPCs: XP reduzido, Stellarium reforçado, Créditos preservados.
- Missões deixam de multiplicar recompensas em 10X/7X/5X/3X e viram bônus controlados.
- Desbloqueios: X-2 LV3, Missões LV5, Piloto LV6, X-3/Semanais LV7, Clã LV8, X-4/Mensais LV10, Especiais LV12, Battle Maps LV15.
- Passe e recompensas de nível entregam mais STL.
- Seções do Passe minimizáveis e trilhas FREE/PREMIUM empilhadas verticalmente.

## 17.6.7 — Pilot Accordion + Economy Fast Path
- Cupom Premium: botão RESGATAR padronizado com os botões dourados do jogo.
- Perfil de Piloto: DEFESA, UTILIDADE e ATAQUE viraram accordions persistentes no padrão do Hangar.
- Regra de dependência: pesquisas de 2/3 níveis exigem máximo; pesquisas de 5 níveis liberam a seguinte no nível 3.
- Economia: remove save forçado quando não há alterações pendentes; LIVE OPS usa cache; consultas independentes rodam em paralelo; Premium é consultado apenas quando a ação precisa dele; gravação de save/perfil é paralela.
- /api/economy/action passa a retornar server_ms para diagnóstico de latência.

# 17.6.4 — HUD Dock Slot Lock

- Minimap fixed permanently in the bottom-right HUD slot.
- Hiding Chat no longer causes minimap reflow/overlap.
- When Chat is hidden, Weapons/Ammo expands into the freed left area.
- Explicit dock slot assignments prevent CSS Grid auto-placement from moving HUD panels.

# V17.6.3 — Admin Control Panel

- Nova aba ADM visível apenas para contas presentes em `game_admins`.
- Busca de contas por callsign, e-mail ou UUID.
- Ban temporário ou permanente com motivo e desconexão da sessão ativa.
- Remoção de ban.
- Reset completo de progresso preservando login, callsign e Premium.
- Exclusão definitiva da conta, obrigando novo cadastro.
- Proteção contra ban/reset/delete de contas administrativas pelo painel.
- Log auditável das ações administrativas.
- Ban aplicado também no login, refresh, APIs autenticadas e Shared Universe.
- Migration: `sql/V17_6_3_ADMIN_CONTROL_PANEL.sql`.

## V17.6.1 — ENVIRONMENT ASSET LOADING HOTFIX
- Cache-busting aplicado também aos arquivos de imagem, evitando fundo/base/recurso antigo ou 404 preso no navegador/CDN após deploy.
- Modo BAIXA mantém o fundo do mapa visível com alpha e efeitos reduzidos em vez de desligar o cenário por completo.
- Pré-carga ativa agora inclui fundo atual, base orbital, portal, recursos presentes no mapa e caixa de loot.
- Assets de cenário V17 ficam protegidos do descarte prematuro do cache durante a partida.
- Recursos/minérios migrados para o pipeline V17 em WebP otimizado.
- Portais agora usam sprite visual próprio do cenário, mantendo os anéis/efeitos leves do Canvas por cima.
- Naves, NPCs, AUX-9 e drones permanecem intocados.

## V17.6.0 — MAPS + PORTALS + ENVIRONMENT REVAMP
- Novos fundos V17 otimizados para X-1, X-2, X-3, X-4, 4-1, 4-2, 4-3, AURORA, NEXUS e ECLIPSE.
- Iluminação ambiente própria por setor, adaptada ao modo de qualidade.
- Portais com cores por rota/destino e efeitos reduzidos automaticamente em dispositivos mais fracos.
- Base X-1 refinada e safe-zone visual menos invasiva.
- Recursos e caixas mantêm sprites originais, com iluminação mais leve.
- Naves, NPCs, AUX e drones não foram alterados.

## V17.5.3 — POSITION PERSISTENCE HOTFIX
- Posição da nave agora persiste corretamente ao atualizar/reabrir o jogo.
- Checkpoint por mapa/território evita fallback indevido para a base.
- Compras e mutações econômicas não sobrescrevem mais a prioridade temporal do snapshot de posição.

## V17.5.2 — ENTITY GRAPHICS LOCK + SCENE PERFORMANCE
- Modo AUTO não remove/rebaixa sprites de NAVE, NPC, DRONES ou AUX-9.
- Assets V17 de entidades ficam protegidos contra descarte do cache.
- Mudança de qualidade atua principalmente no cenário, iluminação, fundo e densidade ambiental.
- Pré-carga ativa reforçada para NPCs presentes e jogadores online.
- Corrigido fallback visual que podia permanecer após AUTO baixar/subir a qualidade.

## V17.5.1 — EVENT CLEANUP HOTFIX
- Limpeza automática de NPCs/ores ao fim ou rotação de eventos.
- Prevenção de acúmulo de ondas e respawns atrasados.
- Sincronização imediata no Shared Universe.

## V17.5.0 — NPC + BOSS VISUAL REVAMP
- Sprites NPC/PRIME limpos e centralizados.
- Auras por família, PRIME e EVENTO.
- TARGET LOCK com retrato do alvo.
- Pseudo-3D/banking visual em NPCs.
- Nenhuma regra de gameplay alterada.

## V17.4.0 — PERFORMANCE + MOBILE PASS

- Novo modo AUTO de qualidade com detecção de celular/desktop, memória, threads e economia de dados.
- Perfil AUTO ajusta resolução, FPS, partículas e efeitos durante a sessão conforme desempenho real.
- Assets V17 convertidos de PNG para WebP com transparência, reduzindo drasticamente o peso do pacote e o download inicial.
- Preload inteligente: carrega somente assets essenciais no boot e faz lazy-load de naves, drones e equipamentos quando necessário.
- Cache de imagens agora possui limite e descarte LRU para reduzir consumo de memória em sessões longas.
- Renderização fica suspensa quando a aba está em segundo plano.
- Mobile Pass remove blur/sombras pesadas, compacta modais e melhora toque sem mexer na lógica de combate.
- Respeita a preferência do sistema por redução de movimento.

## V17.3.0 — FX REVAMP
- Lasers agora possuem assinatura visual diferente por munição (PLS-1/2/3/4 e SIP-2).
- PLS-4 recebeu plasma pulsante; SIP-2 recebeu efeito de drenagem energética.
- Mísseis ganharam trilha, glow, núcleo e onda de aproximação.
- Impactos de escudo, regeneração e reparação ganharam efeitos dedicados.
- Explosões ganharam núcleo luminoso e shockwave em camadas.
- Portais ganharam anéis de profundidade para reforçar sensação 3D.
- Efeitos remotos usam a mesma linguagem visual para PvP/Shared Universe.

## V17.2.0 — SPRITE POLISH + COMBAT VISUALS
- Inclui o polimento V17.1: sprites de nave recortados por componente principal, fragmentos vizinhos removidos e margem segura ampliada.
- Quadros do Hangar/Loja ampliados e imagens centralizadas com escala segura.
- Sprites de mapa também receberam padding seguro.
- NPCs/Bosses migrados para pipeline V17 com padding seguro.
- V17.2: pseudo-3D em combate com banking/lean em curvas, thruster wake dinâmico e aura orbital para designers raros.
- Mesmos efeitos aplicados a jogadores online; NPCs recebem micro-depth/pulse visual.

## V17.0.0 — VISUAL REVAMP / DUAL SPRITE PIPELINE

- Novo pacote visual V17 para naves, AUX-9 e drones com sprites 3D-style e acabamento mais premium.
- Separação de sprites para UI/loja/hangar e sprites para mapa/combate, evitando reaproveitamento da mesma arte em perspectivas erradas.
- Novo manifesto de assets em `/public/assets/v17/manifest.js`.
- Atualização do pipeline para usar `shipMap` e `droneMap` nas renderizações do mapa.
- Refresh visual de ícones principais de equipamentos no tema V17.

## V16.7.9 — HANGAR EQUIPMENT COMMAND

Versão anterior mantida no histórico do projeto base.

## Mission + Loot Polish
- Painel de missões agora permite recolher/expandir cada categoria individualmente.
- Estado de categorias recolhidas é salvo localmente para persistir entre aberturas.
- Cargo box de NPC migrou para o pipeline atual de assets e recebe preload prioritário.
- Cargo box não usa mais fallback de quadrado amarelo; fallback temporário agora mantém formato de crate.


## 17.7.2 — Position Persistence + XP HUD
- NÍVEL no HUD agora mostra nível + XP total e tooltip com XP restante para o próximo nível.
- Novo checkpoint global de localização por conta (mapa, território, X/Y e timestamp).
- No login/reload, a localização local mais recente é reconciliada depois do save econômico, sem substituir saldo/inventário.
- Checkpoints por mapa continuam mantidos para retorno entre setores.


## 17.7.3 — Position persistence hard fix
- A última posição deixa de depender somente do save econômico/localStorage.
- `player_presence` passa a servir também como checkpoint persistente de mapa/X/Y.
- Reload/login restaura o checkpoint local e usa a última presença do servidor como fallback.
- A linha de presença não é mais apagada em `pagehide`/logout; ela apenas fica stale e some das consultas online após 9 segundos.
- Entrar em mapa privado/Galaxy Gate também não destrói o último checkpoint público.
- Mantém o HUD NÍVEL + XP e tooltip de XP restante da 17.7.2.


## 17.7.4 — Authoritative Position Hard Fix
- checkpoint dedicado de posição no Supabase, separado do save econômico;
- posição sincronizada aproximadamente a cada 1s enquanto o jogador se move;
- envio final com fetch keepalive em pagehide/beforeunload/aba oculta;
- login escolhe a localização mais recente entre checkpoint dedicado, local e presença;
- reset ADM também limpa o checkpoint dedicado.


## V17.9.1 — Server Health
- Botão SAÚDE DO SERVIDOR no ADM.
- Score automático 0–100 para CR, STL e dispersão de XP/h.
- Leitura de ritmo LV5/LV10 quando houver amostra.


## V17.9.1 — Jornada do Piloto
- Tutorial orgânico em 6 etapas, sem tela obrigatória.
- Tracker no HUD mesmo antes do nível 5.
- Recompensas pequenas e funcionais; título Iniciado Estelar ao concluir.


## V17.9.1 — Achievements + Titles
- 11 conquistas persistentes com barra de progresso.
- Novos títulos vinculados a conquistas.
- Recompensas de identidade em vez de inflação de moeda.


## V17.9.1 — Refinaria & Crafting
- 6 receitas server-authoritative na base X-1.
- Refino de recursos, munição, mísseis e Bônus de Reparo.
- Custos em CR criam novo sink econômico sem apagar valor da mineração.


## V17.9.1 — Economy 2.0
- Serviços voluntários da base criam sinks de CR escaláveis por nível.
- Buffs temporários de arma, escudo, porão e propulsão, até 6h acumuladas.
- Gastos entram automaticamente na telemetria de saúde econômica.


## V17.9.1 — Social + Grupo de Batalha
- Grupos server-side de até 5 pilotos da mesma facção.
- Convites por callsign, líder, remoção, transferência automática de liderança e saída.
- Rally compartilhado visível no minimapa.
- Membros do grupo recebem identificação tática azul/ciano no mapa e minimapa.
- Sem bônus de CR/STL/XP para preservar o balanceamento econômico.
