# Stellar Legacy V16.5.0 — FINAL DESIGNERS & SOCIAL

## Escopo
Release combinada das etapas planejadas V16.4 (SHIP + AUX DESIGNERS) e V16.5 (VISUAL & SOCIAL FINAL).

## Designers de nave
- Catálogo vem de `live_designs_v16` no Supabase.
- Designers aceitos apenas em naves ELITE (STL) ou ESPECIAIS DE EVENTO.
- Passivos suportados: HP, escudo, dano, XP, crítico e reparação.
- A habilidade da tecla E passa a ser a habilidade do designer ativo; sem designer, permanece a habilidade de classe como fallback.
- Habilidades cadastradas: OVERDRIVE, SHIELD PULSE, HULL MEND, NANO RESTORE, QUANTUM FOCUS e PRECISION BURST.

## Designers AUX-9
- Exclusivos de drops de eventos.
- Bônus possíveis: dano do AUX, HP/escudo como aura de suporte e XP.
- OMEGA SYMBIOSIS é o design mítico híbrido (DANO + ESCUDO + XP).
- Visuais são sincronizados para outros jogadores pelo Shared Universe.

## Drops de evento
- RPC autenticada `claim_event_designer_v165`.
- Valida eventId contra a agenda de `live_event_config_v16`.
- Apenas uma tentativa por jogador/ciclo de evento (claim idempotente).
- Probabilidades continuam centralizadas em `live_drop_rules_v16`.

## Social / minimapa
- Jogadores da mesma companhia agora aparecem no radar em verde.
- Jogadores da mesma aliança são destacados em dourado.
- Hostis permanecem vermelhos e o alvo selecionado permanece amarelo.
- Legenda social adicionada ao painel MAPA.

## Realtime visual
- `shipDesignId` e `pet.designId` trafegam no WebSocket.
- Outros jogadores enxergam glow/filtro/anel do designer de nave e do AUX-9.
- Designers de drone da V16.3 permanecem compatíveis.

## Validação prevista do pacote
- `node --check`: game.js, api.js, data.js, world.js, server/index.js e server/world.js.
- ZIP com arquivos do projeto na raiz, compatível com o instalador atual.
