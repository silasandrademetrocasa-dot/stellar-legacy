# Stellar Legacy V37.0.0 — BEYOND THE FRONTIER

**Pacote completo de instalação única:** todas as alterações de código, migração SQL e rollback. **Não executar o SQL antes do Render ficar Live com V37.** A instalação ZIP não aplica migrações nem modifica diretamente a produção.

## Escopo integrado

1. **37.1 — Fronteiras avançadas:** central de exploração para as regiões existentes X-6, X-7 e X-8. Evitamos acrescentar um X-9 sem migração validada de portais, bases, runtime e NPCs.
2. **37.2 — Caçadas elite:** contratos semanais com alvos verificados pelo ledger de recompensas NPC (`voidCorsair`, `nexusWarden`, `bossAstralReaper`). A IA de boss, HP, escudo e movimentação da V36 continuam intactos; esta versão **não** introduz novos NPCs com fases de combate.
3. **37.3 — Mineração e crafting:** objetivo semanal de prospecção Terbium confirmado por recibos de mineração; fragmentos de expedição são um recurso novo persistido em SQL, não ficam na carga da nave.
4. **37.4 — Tecnologia de nave:** Módulo Explorador LV1–LV3 obtido com fragmentos (5/15), melhora em 10%/nível as próximas recompensas de créditos e STL de expedições. Não altera builds, PvP, ataques, módulos de relés ou velocidade.
5. **37.5 — Coop de clãs:** objetivo semanal compartilhado de oito bosses confirmados no SQL; líder resgata 125.000 créditos uma vez para o cofre, sem depositar na carteira de pilotos.
6. **37.6 — ADM da fronteira:** editor protegido por verificação de administrador e campos numéricos validados para meta, valores, fragmentos, nível mínimo e habilitação dos contratos.
7. **37.7 — Otimização/segurança:** progressão e despesas atômicas no SQL, RLS, recompensas sem duplicação; consultas apenas quando a Frente de Guerra está aberta, sem polling permanente de novos sistemas nem alterações na renderização principal.

## Regras de segurança

- Recibos de kill/mineração emitidos exclusivamente pelo servidor são a origem dos objetivos. As referências X-6/X-7/X-8 são **regiões recomendadas**, não um comprovante SQL de localização do abate; o ledger NPC/Ore anterior não salva mapa para cada recompensa.
- Resgates são por contrato/piloto/semana, semana no horário de São Paulo. O resultado é validado e pago em uma só transação SQL.
- Créditos e STL entram no save por método protegido de servidor e avançam a revisão da recompensa NPC já existente; UI relê o save após resgate.
- Craft de módulo Explorador não modifica estatísticas de combate; buffs só se aplicam ao próximo contrato resgatado.
- Missão coletiva usa recibos oficiais de bosses pertencentes a membros atuais do clã e índice único semanal; somente o líder pode resgatar.
- SQL não apaga ou altera saves, clãs, relés, módulos ou históricos durante a **instalação**. Registros e saldos só mudam por ações autorizadas em jogo.

## Instalação única

1. Subir `STELLAR_LEGACY_V37.0.0_BEYOND_THE_FRONTIER_COMPLETO.zip` na raiz do GitHub e rodar o **Instalador Universal**. `.github/` é **excluída do ZIP**, devendo permanecer no repositório.
2. Conferir **Render Live** e `/health` ou `package.json` em `37.0.0`.
3. Após confirmar, aplicar `sql/V37_0_0_BEYOND_THE_FRONTIER.sql` em Supabase, somente com autorização.
4. Abrir a Frente de Guerra e conferir o painel **Beyond the Frontier**. Os contratos evoluem conforme as ações oficiais registradas.

## Rollback

`sql/V37_0_0_BEYOND_THE_FRONTIER_ROLLBACK.sql` **bloqueia a remoção** se houver missões resgatadas ou progresso de crafting. Nunca derrubar tabelas novas com saldos ou recompensas em produção sem uma migração de reconciliação. Para desfazer apenas código, reinstalar a V36, mantendo as tabelas da V37; os dados continuam lá.

## Testes pós-instalação sugeridos

- 1 jogador nível 22+ mata `voidCorsair`, atualiza o painel, completa 12 abates; a recompensa só é dada uma vez.
- 1 jogador nível 32+ caça 3 `bossAstralReaper`, sincroniza saldo/revisão e permanece com progressão ao recarregar.
- Mineração real Terbium (24 coletas) e resgate único. A meta conta coletas, não unidades.
- Evoluir Módulo Explorador com 5 e depois 15 fragmentos; conferir +10%/+20% na recompensa de contrato seguinte.
- Dois membros do mesmo clã matam bosses, somam no objetivo semanal; só o líder pode receber o prêmio para o cofre.
- Alterar limite de uma missão no ADM, salvar, atualizar e conferir persistência em SQL.
- Medir FPS com munições abertas/recolhidas e painel fechado/aberto; o novo sistema não deveria criar timers permanentes.

**Nota:** testes automatizados não substituem validação real de SQL/Render. Ainda não foram rodados tests end-to-end reais de resgate com Supabase de produção nesta fase.
