# V119.3 - Farm claim concorrente, sem alterar o pagamento SQL

- Bloqueia duas requisicoes simultaneas de claim **no mesmo processo Render** e libera em `finally`.
- Claims em instancias diferentes, apos timeout e reconexao dependem da idempotencia transacional de `stellar_offline_farm_claim_v1111`. Gate HTTP nao substitui garantia do banco.
- Cache de atividade so e limpo quando a resposta SQL confirma termino/cancelamento; rejeicoes preservam a sessao.
- Diagnostico de sessoes que cruzam dia UTC, sem escrita de saldo e sem premios.
- Pendente: migrar NPC/minerio/missoes/Passe/Farm para o comando economico unificado. Manter `observe`.
