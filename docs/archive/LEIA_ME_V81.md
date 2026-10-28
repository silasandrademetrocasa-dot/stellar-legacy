# Stellar Legacy V81 — Balanceamento completo / Portal Astral assistido

Base: V80 (47.7.36) → V81 (47.7.37). Instalador Universal com manifest.

Conteúdo: 34 NPCs, dois Apex Overlord exclusivamente X-7, missões especiais, Portais Astrais, assistência astral com orçamento e confirmação. Curva XP V48.2 e saves EXISTENTES preservados.

Supabase: `sql/STELLAR_V81_BALANCEAMENTO_SQL_APLICAR.sql` contém as configurações ativas e backup administrativo. Importante: o instalador aplica apenas arquivos no GitHub; ele NÃO executa SQL. As configurações SQL já foram aplicadas e verificadas pelo conector no projeto oficial `stellar-legacy` (rxcekofbxzivuavtqjwp). **Não execute novamente o SQL.** Ele é um registro técnico para auditoria/rollback administrativo.

Autopilot: menu -> Portais Astrais -> escolher protocolo, teto de STL, MONTAR (confirmação), ENTRAR, ATIVAR BOT. Parar ao sair do portal/morrer/perder permissão. A automação não gera recompensas; usa ações de combate existentes e a API normal de giro.

A dificuldade e os prêmios de Portais são publicados para novas montagens; corridas existentes guardam seu `gateSetup`.

Riscos: observar CR/STL/h, tempo do Apex X-7, frequência de drops e TTK. NÃO confundir testes automáticos com combate real em vários aparelhos.

Rollback do GitHub restaura apenas o código/arquivos. Para reverter o balanceamento já ativo no Supabase, execute manualmente o arquivo `sql/STELLAR_V81_ROLLBACK_SUPABASE_MANUAL.sql` no projeto correto, após conferir qualquer alteração administrativa posterior. Faça isso apenas se necessário.
