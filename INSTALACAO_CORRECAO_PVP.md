# Corrigindo a sincronização PvP e os relés A/B/C

1. Migração `sql/V21_5_1_RELAY_READONLY.sql`: já aplicada no Supabase conectado. É idempotente.
2. Confirme no Render que a variável PRIVADA `SUPABASE_SERVICE_ROLE_KEY` está configurada no serviço do jogo. A chave **nunca deve ser compartilhada por chat ou enviada ao GitHub**. Sem essa chave, o jogador vê os relés em modo somente leitura, mas não consegue capturar ou receber os eventos online.
3. Suba o ZIP único via instalador GitHub Actions (deixe só um ZIP na raiz).
4. Após o deploy, entre em 4-1, 4-2 ou 4-3. WARFRONT precisa listar A/B/C. Se houver falha de websocket, o jogo mostrará `PvP • ERRO` e a causa; clique **RECONECTAR**.
5. Confirme que os eventos aparecem após recarregar a página e teste uma captura em duas contas. Uma conquista só é confirmada após gravar no Supabase.

Correção sem SQL de apagamento, sem alterar a posse dos relés e sem modificar inventário, dano ou saves.
