# ATUALIZAÇÃO COM SQL — LEIA PRIMEIRO

Consulte **`INSTALAR_V21_4_0_LEIA_PRIMEIRO.md`** antes de instalar. É obrigatório rodar a migração SQL e configurar a service_role key PRIVADA no Render para que as conquistas A/B/C sobrevivam ao F5 e à desconexão.

---

# Stellar Legacy V20.3.3 — ADM unificado

ZIP completo baseado na V20.3.0; integra as fases 20.3.1 (Crafting), 20.3.2 (Economia), 20.3.3 (Navegação ADM). **Não requer novo SQL.**

## Instalação
Envie apenas este ZIP `stellar-legacy*.zip` para a raiz do GitHub, mantendo **um único ZIP de instalação** na raiz. Acesse Actions → Instalar versão do Stellar Legacy → Run workflow. Verifique versão `20.3.3` em `/health` e confira ADM → SISTEMAS no celular.

## Atenção
Não altera intencionalmente gameplay e dados de jogadores. Crie primeiro receitas/serviços de teste **INATIVOS** e confirme a publicação antes de expor aos jogadores. Veja o relatório técnico [`V20_3_3_RELATORIO.md`](V20_3_3_RELATORIO.md).


## V21.3.0 — pacote unificado
Abra **MISSÕES → CENTRO DE COMANDO V21** para ver Elite, Guerra e Temporada. Mais detalhes em `V21_3_0_RELATORIO.md`.

### Guerra de Facções — Centro de Comando

A tela **GUERRA** mostra os nove relés em 4-1/4-2/4-3, os suprimentos diários, histórico, campanhas, rankings e editor de campanhas/regras somente para ADM. O banco foi atualizado com as migrações `V21_5_0_GUERRA_FACCOES.sql` e `V21_5_0B_CLAN_SNAPSHOT.sql`. Consulte `INSTALACAO_GUERRA_FACCOES.md` para os passos de publicação e teste.
