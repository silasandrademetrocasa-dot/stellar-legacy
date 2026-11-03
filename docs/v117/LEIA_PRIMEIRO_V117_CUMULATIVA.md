# Stellar Legacy V117.0 — Cumulativa de homologação com prioridade V116.7

## Instalação
Somente **STELLAR_LEGACY_V117_0_CUMULATIVA_PERFORMANCE_MOBILE_WEBSOCKET.zip** na raiz do GitHub. Executar scripts/stellar-universal-installer.py pelo workflow oficial. **Não** rodar SQL. O pacote preserva V116.4, V116.5 e cumulativas anteriores. Não altera a versão semântica interna `47.7.60` (requisito do instalador). O HTML inclui o sufixo `v1167-mobile-ws` para atualizar o módulo de jogo no navegador.

## V116.6 — Integração multiplayer/eventos (validação)
- Cronograma e limpeza de entidades de eventos passam a ser conferidos a cada 500 ms, em vez de 20 vezes por segundo.
- Combate NPC, laser, PvP, relés, spawns, dano, recompensa, HUD de evento e movimentação permanecem em 20 Hz no servidor.
- `eventCleanupSweepsV1167` e `eventEligibilityChecksV1167` acompanham a execução da agenda.

## V116.7 — Principal: Android, Canvas, WebSocket
- Android perfil Alto: meta local de 30 FPS para compatibilidade com aparelhos mais fracos. Usa DPR limitado a 1.40 em dispositivos leves de memória/CPU e 1.70 em aparelhos mais fortes; efeitos, sprites e arte original continuam em Alta. Média: 30 FPS e DPR adaptado. Baixa: teto 45 FPS no celular; no desktop os perfis não são alterados.
- Interpolação de NPC compartilhado fora da tela: frequência reduzida para até 5 Hz, porém alvos selecionados, boss, evento, NPC próximos e todos os NPC visíveis continuam em toda atualização. Estado oficial no WebSocket, regras de combate e alvo não mudam.
- NPC comum distante no Alto Mobile mantém sprite, mas a etiqueta pode ser omitida para economizar desenho de texto. Alvos, bosses e NPCs de eventos preservam os indicadores completos.
- `npc_batch` e `npc_patch` usam mapa de IDs em vez de `find()` para cada NPC, evitando varredura quadrática e alocação de objeto `rest` por patch. O índice é reconstruído quando a lista de entidades ou seu tamanho muda.
- Diagnóstico local do console: `stellarMobilePerfV1167()`, com modo, limite de FPS, DPR, pixels do Canvas e P95 do intervalo entre quadros. Relatório de desempenho nas Configurações inclui esses dados. Nenhum usuário ou dado de conta é enviado.
- Microbenchmark opcional: `node scripts/bench-mobile-ws-v1167.mjs` (320 NPCs, 36.000 consultas; **não é benchmark de FPS**).

## V116.8 — Auditoria de integridade/compatibilidade
- Testes verificam preservação da proteção SQL de recompensas, recibos de compras, bloqueio de Farm Offline e separação de dano/movimentação das otimizações visuais.
- Nenhum save, banco de dados, recompensa ou equipamento foi alterado por esta atualização.
- A ocorrência `SAVE_NPC_STALE` permanece uma pendência de homologação: esta versão **não** altera o contrato de salvamento nem desativa suas proteções.

## Homologação no Android: 30 min, 2 h e 8 h
1. No Moto E7 testar Qualidade Alto, Médio, Baixo, com o mesmo mapa, mesma quantidade de NPCs, mesmo zoom e HUD. Ativar diagnóstico e copiar o relatório; comparar FPS, P95 e resolução Canvas.
2. Deixar duas contas no mesmo setor e observar aggro, PvP, drops NPC, boss, grupo e sincronização visual. Servidor continua autoridade.
3. Conferir a transição de evento e desaparecimento de entidades em no máximo ~500 ms + ciclo do servidor (sem recompensas extras).
4. Autopilot com venda e compra automática: validar execução sem duplicações. Farm Offline: verificar início/retorno/resgate de sessão curta antes da madrugada.
5. Anotar dispositivo/Android, qualidade, mapa, jogadores, FPS P95, latência, duração e horários de qualquer erro. Não afirmar que 30 FPS reais foram atingidos sem esse teste.

## Reversão
Reverter o commit do Instalador Universal antes desta atualização, sem tocar Supabase. Nenhuma migração SQL foi adicionada.
