# STELLAR LEGACY V111.0 — AUX ECONOMIA, LOJA, LEILÃO E ADM

## Compatibilidade
A atualização foi preparada sobre o código cumulativo V110.2 e o projeto completo enviado em 31/10/2026, sem substituir `server/world.js`, a sequência NPC V1069, nem o algoritmo da V108. Aplicação via Instalador Universal (PATCH). Não executar ZIP V110.0 nem V110.1.

## Layout
As cinco especializações antigas (Guarda, Mineração, Salvager, Reparação e Nova Burst) aparecem em **Hangar > AUX-9 > Informações** com os 12 pontos previamente atribuídos, independentes das CONF 1 e 2. A aba **Protocolos** passa a mostrar somente as cinco famílias avançadas N1–N3, com as artes existentes.

## Economia e limites
- `dano`, `hp`, `escudo`: comprar N1 na loja por **50.000 STL** cada; ADM pode aumentar, não baixar do piso.
- `loot` (Box), `porao`: comprar N1 por **100.000.000 CR** cada; ADM pode aumentar, não baixar do piso.
- N2/N3 seguem fabricação V110 (N2 AUX 8; N3 AUX 15 no Universo).
- Slots de laser/escudo AUX agora custam 15 mil STL (slot 2), 52 mil (5), 146 mil (10), 265 mil (15), 480 mil (22). Demais slots seguem curva suave cadastrada no banco.
- Requisitos de nível do AUX para cada slot não foram modificados. Os slots 2–22 estão editáveis pelo ADM.
- N1 comprado no servidor não é equipado automaticamente; CONF 1/CONF 2 continuam independentes.

## Leilão seguro
O SQL `stellar_v111_aux_protocol_auction_safe` foi **aplicado** no projeto Supabase `stellar-legacy`.
- Cinco protocolos N1 estão registrados, com Leilão habilitado para entrar no catálogo do cliente V111.
- O leilão usa **créditos** mesmo quando a Loja usa STL. O piso N1 atual de elite é ~116,7 milhões CR (conversão global 1 STL = 6667 CR × fator 0,35); para Box/Porão, piso de 100 milhões CR (fator 1,0).
- Alterar preço ou fator do leilão é atribuição do ADM e os lances são conferidos pelo SQL.
- Para dar lance é necessário ter AUX e não possuir N1 daquela família; lance válido apenas na janela horária corrente de São Paulo.
- Um lote vencido é debitado, concedido e marcado como ganho na **mesma transação** no Supabase; o cliente não concede itens localmente.
- O novo RPC só permite execução autenticada; inserções/alterações diretas de lotes `auxProtocol:*` por PostgREST são barradas por políticas RLS restritivas. O RPC antigo de leilão permanece como rotina base V111, sem alteração de algoritmo.
- Repetição de claim vencido tem retorno idempotente, sem segundo débito.

## ADM
Em **ADM > Lojas > Loja Comum e Leilão**, o painel `AUX-9 • PREÇOS / PROTOCOLOS / LEILÃO` permite editar por família preço N1, ativo/visível, leilão on/off, fator do leilão e piso atual. A lista de 21 slots fica recolhida dentro do mesmo painel. Todas as alterações exigem status ADM verificado pelo servidor.

## Implantação
1. Deixe **um único ZIP**, a V111, na raiz do GitHub. Execute Instalador Universal.
2. Confira `Validar projeto` e publicação. A V111 só atualiza arquivo da aplicação; a migração SQL e os preços JÁ foram aplicados.
3. Não rodar novamente o arquivo `sql/STELLAR_V111_PROTOCOLOS_AUX_LEILAO_APLICADO.sql`, pois ele contém um `ALTER FUNCTION` de uso único.
4. Após deploy do Render, teste numa conta descartável: ver preço da Loja, comprar N1, trocar CONF, editar no ADM, dar lance e confirmar premiação no início da próxima hora. Não faça lance e compra na Loja para o mesmo protocolo simultaneamente.
5. Se a publicação falhar, o jogo atual continua, mas o Supabase preserva os preços e permissões novos; não tente usar manualmente o novo leilão com cliente anterior à V111.

**Testes locais:** `npm run check`, `npm test` e instalação com `scripts/stellar-universal-installer.py` aprovados. Não foi executado um leilão real de usuários nem deploy GitHub/Render.
