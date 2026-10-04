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
