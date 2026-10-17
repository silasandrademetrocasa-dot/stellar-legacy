# SQL do Stellar Legacy V20.1.4 CLEAR

O banco de produção **não deve ser reexecutado do zero** ao instalar o ZIP CLEAR. Nenhuma migração foi aplicada nesta operação. Os arquivos SQL de produção foram mantidos como referência e contingência.

- `CURRENT_BACKEND.sql`: referência consolidada do backend principal; não substitui automaticamente todas as migrações posteriores.
- `V17_7_1_TELEMETRY_TITLES.sql`, `V17_7_5_POSITION_SQL_CLEANUP.sql`: telemetria e persistência de posição.
- `V18_*`, `V19_*`, `STELLAR_V19_*`, `V20_*`: migrações incrementais e configurações posteriores; cuidado com ordem e aplicação duplicada.
- Migrações com `ROLLBACK`/`REVERTER`: rotas de contingência, intencionalmente preservadas.
- `V18_2_1_COUPONS_SQL_FIRST.sql`: regras de cupom; detalhes em `../COUPONS_SQL_FIRST.md`.
- `STELLAR_V19_0_16_AUCTION_PRICING.sql`: leilão e regras de preço editáveis pelo ADM.
- `STELLAR_V20_1_PVP_4X.sql`, `STELLAR_V20_1_1_PVP_CADENCIA.sql`: regras PvP e cadência.

A edição CLEAR remove apenas scripts de teste e duplicatas já armazenadas em `sql/`; não descarta migrações com potencial efeito no Supabase nem scripts de reversão. A pasta SQL não é necessária para o boot do Node, mas é importante para manutenção futura.
