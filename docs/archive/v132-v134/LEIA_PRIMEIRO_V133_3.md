# V133.3 — Porão, recortes, loading e leilão

Cumulativa sobre V133.2. Instale somente este ZIP pelo workflow universal e reconecte. Não há novo SQL.

## Porão
Foi identificado um caminho em que recursos de caixas NPC, coletados localmente, podiam ser substituídos por um estado econômico oficial anterior à confirmação dessas coletas. Isso não é uma venda e não deve gerar crédito fictício. O cliente passa a registrar apenas esses ganhos pendentes em um diário de sessão. Ao receber estado do servidor, preserva os ganhos ainda não confirmados; ao confirmar o checkpoint, remove somente os ganhos daquele envio, conservando coletas feitas durante a espera.

Antes de operar na economia ou comprar pelo catálogo, confirma as coletas locais pendentes. Uma venda efetiva continua retirando estoque e creditando saldo pelo gateway do servidor. Não foi aplicado reembolso automático: não há evidência suficiente para calcular o histórico de eventual perda.

A capacidade continua considerando casco, bônus de mapa, extras, serviço de porão, pesquisa Logística e protocolo AUX. Nenhum limite de 3.000 foi criado. Com capacidade 14.875 e gatilho 85%, a venda automática deve ocorrer a partir de aproximadamente 12.644 unidades, sujeita à configuração do Autopilot e às condições de comércio.

O novo diário é de sessão, não uma fila durável de coleta validada por recibos de NPC atravessando recarga do navegador. A proteção usa o watermark clientSavedAt dos checkpoints existentes para reconhecer gravações após confirmação perdida. A coleta online de minério continua autoritativa e não é adicionada novamente ao diário.

## Leilão
Subida automática do preço do SISTEMA muda a cada minuto, não mais continuamente pelos segundos. O valor segue a mesma curva por hora, discretizada em minutos. Lances reais de jogadores podem mudar o preço em qualquer instante.
O envio captura a rodada do clique; consultas e confirmação usam essa rodada, e o cliente recusa enviar se a rodada já mudou durante a espera. Isso não substitui a análise de todas as recusas de lance, cujo cadastro continua na rotina existente.

## Artes
O atlas de designs não possui espaçamento perfeitamente uniforme. O renderer agora usa limites explícitos que acompanham as margens reais, evitando pedaços de naves vizinhas e deformação por esticamento. A conferência em aparelho físico ainda é necessária.
Loading substituído pelas artes aprovadas BATALHA_NATAL_VERTICAL.png e BATALHA_NATAL_HORIZONTAL.png, selecionadas pela orientação da tela. A alteração é no loading web; não altera splash nativo compilado do Android.

## Validação
598 testes Node aprovados e checagem de sintaxe, assets e grafo de módulos. Novos testes: estoque NPC não confirmado, ACK sem apagar coletas posteriores, resposta perdida, saves sobrepostos e preço fixo por minuto. Não houve validação multiplayer real desta correção; o navegador automatizado não estava disponível na revisão desta entrega.

## Teste
- Observar quantidade do porão antes e depois de compra de munição, resgate e sincronização.
- Confirmar saldo pelo servidor ao vender, comparando quantidade vendida e preço por recurso.
- Manter porão acima de 3.000 com capacidade 14.875 para verificar que não é apagado por respostas econômicas.
- Dar lance no início e fim de minuto e ao virar a hora.
- Conferir designs no painel/hangar e loading em retrato/paisagem.
