# V119.5 - corte protegido

O modo de save central v119 permanece `observe` **mesmo que** alguem configure `STELLAR_SAVE_V119_MODE=enforce` no Render, enquanto o registro `SAVE_MIGRATION_COVERAGE_V1195` tiver uma operacao com `migrated:false`.

O registro explicita quais modulos ainda atualizam o canonico por RPC antiga, evitando falso sinal de concluido. NAO marque `true` sem converter o fluxo e ter testes transacionais reais.

O SQL `STELLAR_V119_5_CUTOVER_PRECHECK_SQL_LEITURA.sql` permite conferir discrepancia de hash, Farm, backups e trigger. Nao ativa gatilhos.

Antes de promover qualquer release em producao: salvar backup imutavel, executar SQLs em homologacao, validar duas contas, farm 8h durante meia-noite, gastos concorrentes, premiacao unica e rollback de erros.
