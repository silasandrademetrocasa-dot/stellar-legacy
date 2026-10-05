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
