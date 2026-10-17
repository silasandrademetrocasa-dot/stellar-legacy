# Correção de captura de setores — relatório técnico

**Release:** 21.5.2 (somente em metadados, nunca no menu dos jogadores).
**Base:** ZIP completo 21.5.1.

## Sintoma
A captura dos pontos A/B/C não era confirmada e podia parecer infinita. O progresso era acumulado com um `dt` de sala limitado a 120 ms, mesmo quando o processamento do servidor ficava atrasado. Além disso, a chamada ao Supabase não tinha prazo máximo nem devolvia uma falha clara ao jogador; uma promessa pendente deixava `node.persisting` permanentemente verdadeiro.

## Mudanças
1. A captura usa tempo real entre ticks, com teto de 2,5 s por atualização e somente para jogadores vivos, ativos e dentro do raio do relé; não altera o `dt` do combate.
2. Após 100%, mostra estado **CONFIRMANDO...**; o dono só é alterado após o RPC retornar sucesso do banco.
3. Prazo máximo de 12 s para confirmação SQL e de 5 s para consulta de segurança. Falhas exibem motivo simplificado sem vazar credenciais; aplicam 10 s de espera antes de outra tentativa.
4. Se a confirmação demorou e o banco já registra nova revisão, valida também `captured_by` para distinguir o piloto original de outro capturador da mesma facção.
5. Mensagem `warfront_capture_result` sinaliza sucesso ou falha para o piloto. Conquistas registradas mantêm o domínio até captura rival.
6. Nova bateria de testes de tempo decorrido, erro, timeout, sincronização e UI.

## Banco de dados
Nenhuma migração de esquema é necessária. Foi disponibilizado `sql/V21_5_2_VERIFICACAO_CAPTURA.sql`, consulta somente leitura. O RPC `stellar_commit_warfront_capture` e as tabelas existentes são reutilizados. Não reinicializar ou zerar os nove relés.

## Limitações
Testes automatizados e verificação SQL local/servidor não substituem a validação do Render + WebSocket + celular. A causa específica de uma falha de escrita em produção ainda depende dos logs do serviço e/ou de uma mensagem de erro capturada nessa versão.
