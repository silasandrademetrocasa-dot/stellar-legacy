# V133.2 — Gateway de validação e persistência unificado

Cumulativa sobre V133.1. Instale somente este ZIP pelo workflow universal. SQL V133.2 aplicado e permissões conferidas no Supabase durante esta entrega. Não é preciso reaplicar.

## Unificação implementada
Os commits econômicos da rota /api/economy/action, incluindo venda de porão, a entrega de missões e a liquidação/entrega do leilão passam pelo mesmo RPC stellar_commit_command_v1332. Compras em lote também usam esse gateway para o commit.

O gateway valida identidade do pedido, módulo, hash, formato e permissões, serializa comandos por jogador, executa o validador especializado e grava um recibo comum na mesma transação. Os validadores V125 (economia) e V118.2 (leilão) são chamados dentro da transação, preservando seus controles de estoque, preço, saldo, concorrência por lote, vencedor, débito e entrega. A tabela comum é stellar_command_receipts_v1332.

O recibo comum não guarda uma cópia antiga do jogador. Repetir uma operação confirmada retorna seu comprovante com o estado atual; ID reutilizado com outro conteúdo ou módulo é recusado. Recibos antigos V125/V118.2 continuam válidos e podem ser reconhecidos sem executar outra entrega.

A revisão de observação V133 continua registrando mudanças reais no mesmo game_saves. Nenhum gateway novo grava pelo navegador; somente service_role pode executá-lo.

## Escopo e limites
A liquidação financeira do leilão está unificada; o cadastro de lances continua na RPC place_auction_bid_online existente. A coleta de minério/NPC, o farm e outros escritores ainda têm caminhos próprios. O checkpoint HTTP continua no gateway V133. Portanto esta versão não declara concluída a migração de todos os RPCs do jogo nem promove artificialmente o gate V119.

Clientes antigos sem ID de operação recebem ID gerado no servidor; não têm a mesma garantia de identidade entre duas requisições independentes após timeout. O cliente cumulativo atual fornece IDs para vendas.

Mantém as limitações da V133.1 sobre progresso de missões e multiplicadores temporários de XP. Não há medição nova de latência ou FPS em Android físico.

## Validação
593 testes Node aprovados e checagem de sintaxe, módulos e assets. Teste PostgreSQL local com SQL real do gateway, V125 e V133, persistência V118 e executor de leilão simulados: aplicação repetida, um recibo por comando, replay de venda sem repetição de efeito, replay do leilão sem novo débito, estado posterior preservado, ID cruzado recusado e acesso direto negado a authenticated. As regras completas de leilão ainda exigem homologação multiplayer em produção; o teste local do gateway não é um ensaio do leilão real.

## Teste recomendado
1. Venda o porão, receba recompensa NPC e consulte novamente a venda.
2. Repita a confirmação de um prêmio de leilão já entregue: não deve cobrar ou conceder novamente.
3. Conclua missão enquanto recebe recompensas e vende recursos.
4. Desconecte durante a confirmação, reconecte e confira estoque, saldo e itens.
5. Se houver diferença, informe horário, lote/contrato e valores antes/depois.
