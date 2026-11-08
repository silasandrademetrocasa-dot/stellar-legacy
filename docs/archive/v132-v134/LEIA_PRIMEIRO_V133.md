# V133 — Persistência: primeira etapa da migração

Cumulativa sobre V132.1. SQL V133 aplicado e consulta de leitura conferida no Supabase durante a entrega.

Instale somente este ZIP pelo Instalador Universal existente e reconecte ao jogo.

## O que mudou
O checkpoint HTTP passa pelo gateway transacional V133 com recibo durável por operação. Uma resposta perdida depois do commit pode ser recuperada consultando o mesmo ID, antes de recusar o token antigo. O recibo usa hash do pedido: reutilizar o ID com outro conteúdo é recusado. O cliente mantém a fotografia e o ID de uma tentativa pendente durante os retries da sessão, sem associar o mesmo ID a dados diferentes.

O PostgreSQL conta mudanças reais no game_saves em stellar_save_clock_v133. A observação alcança escritores de NPCs, minério, leilão, recompensas, farm e demais módulos, inclusive os que não usam o gateway HTTP. A contagem não altera o JSON do jogador e não é uma autorização para gravação. Os validadores de economia, missões e equipamentos continuam ativos.

Recuperar um recibo não restaura o save antigo: o servidor devolve o estado atual. O cliente o reconcilia pelo instalador econômico existente, preservando intenções pendentes de missão/equipamento quando válidas. A próxima tentativa usa outro ID após confirmação.

## Limites desta entrega
Esta é a primeira etapa, não a conclusão da migração de todos os módulos. Missões comuns ainda confirmam progresso e prêmio em duas gravações; leilão e operações econômicas mantêm seus recibos próprios. O gate V119 permanece sem promoção forçada. Não foram migrados automaticamente todos os RPCs legados para comandos V133.

Os IDs de checkpoint pendentes são mantidos em memória na sessão. Recarregar a página durante uma falha ainda depende da recuperação local existente e do estado oficial. Não foi acrescentada uma fila durável de comandos de missão/porão atravessando reinícios.

Não há promessa de redução medida de latência nesta etapa. A recuperação evita regravar um checkpoint já confirmado, mas a leitura de recibos, o rastreamento SQL e a reconciliação têm custo. Medir com uso real antes de ajustar frequência de saves.

## Validação
Testes PostgreSQL local com rotinas V131/V133 reais e persistência V118 simulada: aplicação repetida do SQL, resposta perdida, replay, ID reutilizado com outro hash, recompensa posterior preservada, snapshot antigo recusado, revisão comum incrementada por escritor independente e acesso negado a authenticated.
Suíte Node e checagem estática do projeto executadas na preparação. Falta validar com duas contas e falhas de conexão no Render de produção.

## Seu teste
1. Avance uma missão e faça uma venda; reconecte e confira ambos.
2. Faça lance no leilão enquanto recebe recompensas NPC.
3. Interrompa a rede por alguns segundos durante o salvamento; restabeleça sem recarregar e aguarde a sincronização.
4. Depois repita recarregando a página durante a interrupção, para avaliar a recuperação local ainda legada.
5. Registre horário, operação e valores antes/depois se ocorrer divergência.

A próxima etapa deve migrar conclusão/prêmio de missões para uma operação atômica com recibo e fila durável; depois, reconciliar os comandos de porão e de leilão com o mesmo modelo. O rastreamento desta versão ajuda a localizar as gravações concorrentes.
