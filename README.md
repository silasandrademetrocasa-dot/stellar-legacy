# Stellar Legacy V20.2.10 — Agendamento rAF + Diagnóstico de FPS

Versão **completa**, baseada em **V20.2.9**. Não é patch parcial. Mantém todo o jogo e os SQLs existentes.

Instalação: suba **somente este ZIP** na raiz do repositório GitHub e execute `Actions → Instalar versão do Stellar Legacy → Run workflow`. Não faça upload do ZIP descompactado pelo instalador. Confira `20.2.10` em `/health` ou no jogo após deploy.

Para medir: `CONF → JOGO → DIAGNÓSTICO DE DESEMPENHO`, ative, jogue no modo BAIXO e use **Copiar relatório técnico**. Campos novos: rAF bruto, intervalo rAF bruto p95 e quadros pulados pelo limitador.

Leia `V20_2_10_RELATORIO.md` antes de interpretar os resultados. `npm run verify` valida sintaxe, sprites, scripts e regressões sem acessar a conta de ninguém.
