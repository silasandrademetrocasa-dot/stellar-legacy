# V10.5 — Online Universe

## Jogadores online
- Nova tabela `player_presence` no Supabase.
- Pilotos do mesmo mapa aparecem em tempo quase real.
- Nome, nível, nave, facção, HP e escudo sincronizados.
- Interpolação visual reduz teleporte entre atualizações.
- Indicadores verdes no minimapa.
- Galaxy Gate ALFA permanece uma instância privada.

## Leilão PvP real
- Removido completamente o competidor "SISTEMA".
- Lance inicial: 100.000 CR.
- Apenas outro jogador pode cobrir o líder atual.
- O líder não pode aumentar o próprio lance.
- RPC transacional no Supabase serializa concorrência e valida saldo/garantias.
- Líder e valor atual sincronizam online entre jogadores.
- Ao ser superado, o lance deixa de reservar Créditos.
