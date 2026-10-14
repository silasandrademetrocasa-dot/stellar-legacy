# Stellar Legacy V19.0.12 — Navegação ADM sem limites de mapa

- Admin verificado no Supabase por `is_game_admin_v1763` (papel no cadastro `game_admins`). Não confia no callsign nem em flags enviadas pelo WebSocket.
- ADM vê todo o mapa estelar e pode entrar em qualquer setor X-1 a X-8 / 4-1 a 4-3, independentemente de facção, nível ou bônus de salto. Salto livre não consome bônus de salto.
- Jogadores comuns continuam com restrições de facção, nível e consumo de bônus.
- Servidor WebSocket faz a liberação somente após confirmação da role pelo banco em cada entrada de setor; não habilita invasão para jogadores comuns.
- Checkpoints e saves do ADM preservam o setor de facção alheia após atualizar a página. Não transforma uma base estrangeira em base segura para o ADM.
- Portais Astrais/Galaxy Gates são instâncias especiais e continuam com suas próprias regras de acesso; nenhuma instância foi forçada pelo mapa estelar.
- Nenhuma migração SQL nova é necessária.
- Instale com o ZIP completo no instalador principal existente, sem modificar seus workflows.
