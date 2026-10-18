# Relatório V22.9.1 — Relés, eventos e AUX-9

**Origem:** pacote integral V22.9.0, já publicado.
**Mudanças:**
- `server/world.js`: entrada nas salas PvP não bloqueada pela consulta inicial de relés; captura só fica habilitada após sincronização persistente, com timeout e tentativas posteriores em caso de falha. Envio imediato de evento pós-ingresso e correção de atualização de cache/eventos no mesmo mapa.
- `server/index.js`: opção de atualização do cache de LIVE OPS é propagada da sala ao backend, sem aguardar refresh de 15 segundos ao entrar.
- `public/game.js`: Sentinela restrito a agressores NPC que efetivamente causaram perda de HP ou escudo, janela de 12 segundos, nenhuma agressão a alvo selecionado/manual ou outro jogador; HUD de eventos atualizado ao receber evento e fallback de relés preservado em reconexões.
- `public/modules/sentinel-defense.js`: predicados puros de elegibilidade e seleção, com testes.
- `tests/v2291-relays-events-sentinel.test.mjs`: 8 testes novos de comportamento e segurança; testes legados de carregamento de relés atualizados para refletir a sincronização não bloqueante.

**Validação:** `npm run verify` passou com 304/304 testes; 100 fontes JS verificadas e 216 caminhos de assets. Integridade do ZIP verificada com `zipfile.testzip`.

**SQL:** nenhum SQL novo. **Deploy GitHub/Render:** não executado nesta etapa.

**Não alterado:** saldos, preços, progresso, tabelas SQL, faixas de nível, regras de captura e demais módulos AUX.
