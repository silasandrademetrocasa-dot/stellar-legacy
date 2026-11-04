STELLAR LEGACY V119.1 — MIGRAÇÃO DE SAVE ÚNICO (INCREMENTAL)

- Arquivos de jogo: atualização do GET /api/save (leitura de reset em paralelo),
  diagnóstico de latência P95/P99 e painel de logs privados via API.
- SQL: capture adaptativa da revisão, checkpoints A/B/C amostrados e view
  SOMENTE LEITURA de NPC, minérios, leilão, Farm e save.
- A migração de auditoria central é OPCIONAL e requer validação de carga.
- NÃO RODAR o SQL ATIVAR sem homologação e sem confirmar que não há Farm.
- Mantém STELLAR_SAVE_V119_MODE=observe. Não habilitar enforce.
- Não apaga contas, prêmios, itens, progressos nem configurações.

LEIA: docs/v119/MIGRACAO_V119_1_E_PERFORMANCE.md
