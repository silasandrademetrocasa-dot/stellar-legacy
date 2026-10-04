# Stellar Legacy V15.1.0 — REALTIME COMBAT PRESENCE

## Objetivo
Reduzir delay percebido do Shared Universe e sincronizar visualmente o combate entre jogadores.

## Alterações
- Estado de jogadores via WebSocket a cada ~75 ms durante atividade.
- Mudança de laser/alvo/AUX ignora throttle e é transmitida imediatamente.
- Remote players recebem laserFiring, laserColor, laserAmmoId/name e target.
- AUX-9 remoto recebe posição, ângulo, nível, modo e laser ativo/alvo.
- Render server: world tick 50 ms (20 Hz), NPC batch 100 ms (10 Hz), event update 500 ms.
- Cliente: interpolação/predição curta de players, AUX-9 e NPCs.
- Presence Supabase permanece como fallback e metadata, sem sobrescrever realtime saudável.
- WebSocket perMessageDeflate=false, reconnect 700 ms, ping 3 s e TCP no-delay quando suportado.

## Compatibilidade
- Sem SQL novo.
- Saves V15.0/V14.x compatíveis.
- Galaxy Gate segue privado.
- PVP existente preservado.
