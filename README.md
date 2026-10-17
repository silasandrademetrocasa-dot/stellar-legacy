# Stellar Legacy V20.3.0 — ADM de Missões Visuais

ZIP completo cumulativo construído sobre V20.2.10. **Nenhum SQL novo**.

## Instalar
Envie somente este ZIP para a raiz do GitHub, mantendo um único ZIP `stellar-legacy*.zip` na raiz. Execute **Actions → Instalar versão do Stellar Legacy → Run workflow**. Verifique `20.3.0` em `/health` após o deploy.

## Novidades
ADM → SISTEMAS → MISSÕES: modelos de missão, duplicação segura, prévia em tempo real e validação de objetivos/prêmios. A duplicação gera rascunho **inativo**, com ID vazio, para proteger a missão original. Reutiliza endpoints existentes, sem novas migrações.

Detalhes: [`V20_3_0_RELATORIO.md`](V20_3_0_RELATORIO.md).

O instalador não altera o banco de dados. O deploy depende da configuração existente no GitHub/Render. Salvos de jogadores e regras de combate não foram modificados intencionalmente.
