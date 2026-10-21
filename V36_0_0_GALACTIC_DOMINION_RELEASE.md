# Stellar Legacy V36.0.0 — Galactic Dominion (pacote único)

**Entrega:** ZIP de release completo, para uma única instalação pelo Instalador Universal. Nenhum script executa migrações SQL automaticamente durante a instalação. Nenhum dado de jogadores, clãs ou inventário é limpo.

## Cronograma consolidado

**36.1 — Fortalezas Galácticas**
- Estruturas LV1/LV2/LV3 preservadas da V35, com reforços de placas, pylons, faixa da facção, defesas de escudo e detalhes de cidadela no desenho do mapa.
- Regeneração **real no Supabase**: processamento de um lote com até nove relés a cada 60 segundos, **apenas com jogadores conectados** e em relés pertencentes a clãs, vivos, fora de combate pelo tempo do ADM. Os módulos Nanobots e Regenerador aumentam sua respectiva regeneração conforme o nível. Não existe regeneração de relés destruídos nem cura de emergência ao trocar módulos.

**36.2 — Clan Wars 2.0 (territorial)**
- Líder do clã pode declarar ou agendar uma guerra entre 2 minutos e 7 dias de antecedência. Prazo, espera entre guerras e prêmios são configurados no ADM.
- Atacante só pode ter uma guerra ofensiva simultânea; mesmo par de clãs não pode repetir o confronto até vencer o cooldown. Bloqueio transacional no SQL.
- Resultado após o encerramento usa ações oficiais de conquista (5 pts) e defesa (2 pts). Só o vencedor com atividade real pode resgatar uma premiação, uma única vez.
- O modo antigo de Guerra de Clãs é mantido intacto; guerras territoriais são um calendário separado e usam os registros de combate existentes.

**36.3 — Dominação Territorial**
- Benefício diário por relés dominados, pago ao **cofre do clã**, não ao jogador, limitado por valor por relé, limite diário e reivindicação única por dia/clã. Relés com HP zero não contam.

**36.4 — Combat Evolution**
- Novos detalhes visuais nos relés de nível mais alto sem mudar o dano do jogador, munições, escudos ou cálculos de combate.
- Máximo de 3 efeitos de torretas em qualidade baixa, 5 no mobile e 8 no desktop. Sem sombras pesadas no baixo.

**36.5 — Missões de Guerra & Ranking**
- Missão semanal de conquistas/defesas com objetivo e créditos editáveis no ADM, resgate único por clã e período no SQL.
- Ranking dos clãs por relés vivos, conquistas e defesas. A contagem exata para pagar a missão é feita no SQL.

**36.6 — ADM Total Control**
- Novo editor do Domínio Galáctico no painel da guerra: regeneração, repouso, tributo, teto de créditos, meta semanal, prêmio semanal, duração e cooldown de guerras e prêmio do vencedor.
- Manutenção dos editores anteriores de fortificações, módulos, mapa e eventos.

**36.7 — Performance & Segurança**
- Uma chamada SQL por ciclo para todas as fortalezas; nenhuma regeneração local, nenhuma nova rotina por frame, sem redesenhos animados do painel de guerra.
- Payloads com limites e acesso autenticado; privilégios e cobranças validados no banco, RLS ativa, idempotência de recompensas, limites de abuso de declarações, teste completo de regressão.

## Instalação — duas etapas, somente quando desejar testar

1. Enviar `STELLAR_LEGACY_V36.0.0_GALACTIC_DOMINION_COMPLETO.zip` via workflow **Stellar Legacy — Instalador Universal**. Confirmar Render **Live** e versão `36.0.0` no `/health`. A pasta `.github` deve permanecer no repositório; ela está **fora do ZIP** de propósito.
2. Depois de Live e com autorização, aplicar `sql/V36_0_0_GALACTIC_DOMINION.sql` no Supabase. A migração é transacional e **exige que a V35 já esteja migrada**. Se não for aplicada, a V35 continua operando; o painel novo informa que a migração está pendente.

## Rollback controlado

`sql/V36_0_0_GALACTIC_DOMINION_ROLLBACK.sql` **suspende** os recursos novos e revoga execução das novas funções. Não apaga históricos, créditos resgatados, clãs ou saves e não estorna pagamentos. Depois, se precisar, reinstalar o ZIP V35.

## Critérios de testes em produção após o SQL

- Abrir o painel de guerra com conta comum, líder e ADM; conferir permissões.
- Testar guerra imediata e agendamento, cooldown e conclusão, inclusive prêmio de vitória único.
- Resgatar tributo de um clã dono de relé e tentar duplicar a transação.
- Regenerar escudo fora de batalha e garantir que ataque contínuo impeça regeneração. Confirmar regeneração dos módulos Nanobots e Regenerador.
- Conferir ranking e missão semanal; validar persistência após logout/login e troca de mapa.
- Medir FPS mobile com munições abertas/recolhidas e torretas disparando, em gráfico baixo e médio.

**Sem alterações no Supabase ou Render durante a montagem deste ZIP.**
