# V134.1 — AUX, coleta e leilão

Versão técnica 47.7.65. Atualização sobre V134 / 47.7.64. Instale este ZIP pelo mesmo workflow universal existente; não precisa reenviar as artes.

## Banco e ordem de instalação

O cutover `STELLAR_V134_CUTOVER_ROTAS.sql` e a migração `STELLAR_V134_1_COLETA_LATENCIA.sql` foram aplicados no Supabase nesta entrega. Foram conferidos o bloqueio do INSERT histórico no leilão, a permissão do lance atual, a função de snapshot e a proteção de capacidade. Falta publicar o código deste ZIP e reabrir o jogo para carregar o cliente novo.

Em outro ambiente que já tenha a V134, aplicar somente a nova migração V134.1 antes do deploy. Não reaplicar a preparação completa V134 depois desta migração: ela substituiria a função de commit atualizada. Não executar scripts históricos, recovery ou fixtures em lote.

## Correções

- AUX coleta pelo próprio alcance e posição, usando a mesma fórmula de radar/protocolos do jogo. A nave não precisa encostar na caixa. O servidor continua verificando propriedade do AUX, módulo comprado, modo ativo, mapa, posição recente e contato do AUX com a caixa.
- Leitura de save, recibo e drop ocorre em paralelo. Snapshot de caixas e loot usa uma consulta RPC. Configuração usa cache curto de cinco segundos; saldos e recibos não usam cache.
- Coleta confirmada não reaparece por uma resposta antiga. Repetição após resposta perdida devolve o recibo sem pagar duas vezes. Espaço do porão é conferido novamente dentro do bloqueio comum da conta para duas coletas concorrentes.
- Lance atual vai diretamente para a validação autoritativa, sem aguardar uma consulta extra de mercado e um checkpoint antes do pedido. Saldo, rodada, piso e garantias continuam conferidos no SQL.
- Snapshots removem apenas drops temporários expirados da própria conta, mantendo recibos de emissão e comandos.
- As entradas históricas já estão fechadas para o cliente. As implementações SQL ainda usadas internamente são preservadas.

## Limpeza

Foram removidos dois módulos sem referências: autopilot v116 e bridge v121. Os módulos usados continuam presentes. Sete instruções antigas saem da raiz e ficam arquivadas em `docs/archive/v132-v134`. O manifesto do instalador executa essas nove remoções. As artes e demais arquivos com referências dinâmicas foram preservados. Inventário em `docs/v1341/CLEANUP.json`.

## Validação

625 testes passaram, incluindo SQL real em PGlite, migração repetida, permissões, AUX longe da nave, recuperação de confirmação e disputa do espaço do porão. A suíte verifica código, assets e imports. O ZIP foi instalado sobre uma cópia V134: nove remoções executadas, 1.096 assets preservados e os 625 testes passaram novamente. A abertura no navegador móvel simulado mostrou login e canvas, sem erro JavaScript, com health HTTP 200. Não foi feito teste de carga em produção e não há medição de redução de latência em milissegundos.

Depois do deploy: testar AUX em modo coleta com nave distante, alternar módulos, coletar/vender durante combate e dar lance na virada. Conferir saldo após reabrir. A redução de chamadas trata esperas identificadas; medir o comportamento real continua sendo necessário.
