# Stellar Legacy V11.1 — Patentes & Ranking

## Novidades principais
- Sistema de **patentes** inspirado no padrão clássico do DarkOrbit.
- **Ranking por pontos** com fórmula adaptada e novos painéis no menu de configurações.
- Patente especial **Administrador** para contas marcadas na tabela `game_admins`.
- Promoção automática do perfil **FELP22 / FELP22[ADM]** para admin ao rodar o SQL.
- Novo destaque visual da patente no topo da HUD e também na aba da conta.

## Arquivos importantes
- `sql/V11_1_PATENTES_RANKING.sql` → aplicar no Supabase.
- `public/index.html` → nova interface do ranking.
- `public/style.css` → estilos das patentes/ranking.
- `public/game.js` → lógica do ranking, patente atual e painéis.
- `server/index.js` → versão do projeto atualizada para 11.1.0.

## Observações
- O ranking usa a RPC `get_public_rankings()`.
- A arena continua funcionando normalmente; agora as vitórias/derrotas entram no painel novo.
- Caso queira adicionar mais ADMs depois, basta inserir o `user_id` na tabela `public.game_admins`.
