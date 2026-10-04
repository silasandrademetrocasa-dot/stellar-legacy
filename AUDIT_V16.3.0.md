# AUDIT V16.3.0 — DRONE DESIGNERS

## Escopo
- FURY CORE / AEGIS VEIL / TITAN HYBRID.
- Bônus por drone e bônus de set completo 8/8.
- Drop 10% Nexus e 10% Eclipse; Titan reservado para evento.
- Inventário/equipamento persistidos no Supabase.
- Visual dinâmico no canvas e Hangar.

## Segurança
- `get_my_designers_v16` e `set_design_loadout_v16` exigem sessão autenticada.
- Equipar design valida que o drone existe no save online da própria conta.
- `claim_gate_drone_design_v163` usa portal + número da conclusão, checa a conclusão sincronizada em `game_saves` e impede claim duplicado.
- RPC genérica antiga de roll de designer foi removida do papel `authenticated`.

## Compatibilidade
- Nenhuma alteração nos slots ou equipamentos existentes dos drones.
- Quem não tem designer mantém atributos e visual anteriores.
