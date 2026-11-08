# V133.1 — Candidata de persistência para teste

Cumulativa V133 + V132.1. Suba somente este ZIP pelo workflow Instalador Universal e reconecte. O SQL V133 já foi aplicado; esta etapa utiliza também os recibos V125 existentes, sem novo SQL obrigatório.

## Missões online
O cliente não adiciona mais moedas ou itens ao concluir uma missão comum online. Envia categoria e identidade do contrato. O servidor lê a missão completa já persistida, valida objetivos e confirmação, calcula o prêmio a partir do acumulador salvo e sorteia o item conforme as regras de categoria. Créditos, STL, XP, item e recibo de conclusão são gravados juntos via transação V125. O ID é determinístico por conta/categoria/período/contrato. Repetir após resposta perdida recupera o estado atual e o recibo; não sorteia nem paga outra vez.

O progresso dos objetivos ainda é salvo pelo checkpoint antes do comando de resgate. Portanto ainda existem confirmação de progresso e comando de prêmio separados: a melhoria é retirar do navegador a aplicação do prêmio e tornar a entrega e a conclusão uma única transação.

O servidor usa os bônus passivos de XP de nave/AUX persistidos. Efeitos temporários de habilidade e bônus de relé de XP não foram integrados ao cálculo deste comando; precisam de homologação para equivalência completa com o multiplicador legado.

Em falha, o contrato permanece completo até a entrega confirmada. A sessão consulta novamente a cada 10 segundos quando não há outro save pendente. Ao reconectar, usa o contrato persistido; não é uma fila local durável de eventos de abate ainda não enviados.

## Respostas antigas
Antes de instalar um estado, o cliente compara revisões de compras, NPC, minério e Elite. Resposta que regride qualquer uma dessas autoridades é recusada e mantém o progresso atual. Isso não usa máximo de saldo: compras e outros gastos legítimos continuam possíveis. Troca de conta e reset administrativo são tratados separadamente.

## Demais módulos
Porão/vendas continuam nos recibos V125/V130. Leilão continua na transação V118.2. O rastreamento comum V133 observa ambos. Não foi feita a substituição de todos os RPCs legados por um único gateway de comandos. O gate de promoção V119 permanece sem marcação artificial de cobertura.

O checkpoint V133 mantém fotografia e ID durante retries da sessão. Recarregar ainda depende da recuperação local existente. Não foi demonstrada uma redução de latência em produção. Esta candidata é para homologar recuperação e entrega, não uma declaração de migração integral concluída.

## Testes executados
592 testes Node aprovados e checagem de sintaxe/assets/módulos. PostgreSQL local (PGlite): rotinas reais V131, V133 e V125, com persistência V118 simulada; replay após perda de confirmação, snapshot antigo recusado, prêmio posterior preservado, missão e prêmio no mesmo estado transacional, um recibo por resgate e acesso RPC negado a authenticated.

## Seu teste
- Concluir uma missão, receber o prêmio, reconectar e confirmar saldo/itens/contrato.
- Cortar a conexão durante a confirmação do prêmio e tentar novamente após reconectar.
- Receber NPC enquanto vende porão, compra munição ou consulta entrega de leilão.
- Confirmar que gasto legítimo reduz o saldo e que resposta antiga não apaga o ganho posterior.
- Informar horário, categoria/ID do contrato e operação em caso de divergência.

Falta homologação multiplayer de produção, comparativo de latência e a migração integral dos escritores legados. Não chamar de lançamento definitivo antes desses testes.
