# AUDIT V16.2.0 — CHAT DOCK

## Escopo
- GLOBAL / ALIANÇA / PV.
- Persistência no Supabase.
- UI minimizável e reflow automático do dock inferior.
- Segurança via RPC autenticada, RLS fechado e histórico filtrado por canal/participantes.

## Validações esperadas
1. GLOBAL aparece para contas diferentes.
2. ALIANÇA só retorna mensagens do mesmo clã.
3. PV exige callsign existente e só os dois participantes visualizam.
4. Recolher/ocultar CHAT ou MAPA faz MUNIÇÕES ocupar o espaço livre.
5. Mensagem >240 caracteres é bloqueada; spam abaixo de ~700ms é limitado pelo banco.
