# V115.0 — WebSocket, tráfego e monitoramento

## Entrega isolada

- Em clientes com mais de 256 KiB pendentes no socket, **somente** `world_player_patch` é adiado; NPC damage, kill credits, transações, chat/avisos críticos, captura, evento e snapshot não entram nesse descarte.
- O servidor mantém em memória uma lista de pilotos cujo update foi adiado. Quando a fila fica abaixo de 128 KiB, transmite **estado completo** de até três pilotos por ciclo; assim, mesmo sem novo movimento, o minimapa converge ao valor oficial.
- Evita recriar um array só para contar receptores de movimento. Nenhuma mudança em FPS/renderização da nave local, nem nas tabelas de economia.
- Novo endpoint read-only para ADM `/api/admin/v115/quality`, validando `is_game_admin_v1763`. Retorna número de salas, conexões, NPCs, bytes enviados, frames adiados e resincronizados; não expõe tokens, contas, inventários ou recompensas.

## Aceite

Testar 2+ celulares e um perfil de rede lenta. Verificar que o piloto remoto recupera a posição correta após descongestionamento sem F5, e que nenhum golpe/recompensa se perde. Comparar `outboundKBps`, `playerMotionDeferred` e `playerMotionResynced` antes/depois. Comparar FPS P95/P99 em cada perfil gráfico. Meta de 30 FPS alto ainda exige teste real em aparelhos-alvo; estes testes de código **não provam FPS de hardware**.
