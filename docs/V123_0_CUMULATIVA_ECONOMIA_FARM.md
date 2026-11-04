# Stellar Legacy V123.0 — cumulativa econômica + resgate de Farm

## Pré-requisitos
1. V122.0 implantada.
2. Executar **uma vez** `sql/STELLAR_V123_0_ECONOMIA_COMPRA_IDEMPOTENTE.sql` antes do deploy. A migração apenas cria tabela/índice/RPC e RLS; não zera saves.
3. Aplicar **somente** o ZIP V123.0 pelo Instalador Universal do GitHub.

## Entregas reais
- Compras comuns novas enviam `request_id` persistido na aba. Retentativa usa mesmo ID; servidor confirma em `stellar_live_purchase_receipts_v123`, débito e concessão dentro da transação SQL.
- RPC usa lock por conta e compare-and-swap no timestamp `game_saves.updated_at`, prevenindo uso de save antigo.
- Elimina `flushCloudSave(true)` antes de toda compra: mantém flush obrigatório caso equipamentos, missões ou munição críticos estejam pendentes.
- Reentrada de compras após timeout faz replay do recibo sem debitar novamente.
- Resgate do Farm Offline perdido por timeout consulta status confiável antes de liberar mundo; a RPC de liquidação original segue como única pagadora.
- IndexedDB e checkpoints da V122 preservados; créditos e STL NUNCA são autorizados no navegador.

## Limites e segurança
- V123 migra a rota `/api/live/purchase` para os clientes atualizados. Rotas de compra em lote, venda, troca, Craft, leilão, missões premiadas, PvP e Warfront ainda têm caminhos legados próprios.
- A tabela V123 contém recibos duráveis, não é uma segunda tabela de saldos.
- Nenhum zero/reset no banco, nenhuma alteração de `STELLAR_SAVE_V119_MODE=observe`, nenhum corte da autenticação.
- Testes automatizados não provam FPS em Android nem resgates de 8 horas reais; testar no aparelho antes de remover writers legados.
- Um `ECONOMY_STALE` indica concorrência e bloqueia a compra em vez de arriscar débito duplo: atualizar saldo e repetir.
