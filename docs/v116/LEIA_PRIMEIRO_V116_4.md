# Stellar Legacy V116.4 — Comércio seguro + Materializador • CUMULATIVA

**Base cumulativa:** V116.3, V116.2, V116.1, V115 e anteriores.
**Instale SOMENTE este ZIP pela raiz do GitHub usando o Instalador Universal.**
**SQL:** não é necessária migração nova. Nenhum save ativo, moeda ou inventário foi modificado na criação do pacote.

## Comercialização automática
- Uma venda ou compra automática usa `request_id` persistido no navegador por usuário/produto e recibo oficial no `game_saves`.
- Se a resposta de rede falhar, repetir o MESMO `request_id` consulta o recibo: não vende nem cobra novamente.
- O registro do recibo acompanha a atualização de estoque e saldo no servidor, numa só escrita; continua valendo após reiniciar o Render.
- O endpoint de salvamento copia o recibo já existente do servidor; a versão local não consegue apagar nem forjar recibos.
- Compras e vendas esperam o save local ser confirmado antes de negociar, preservando cargas e missões ainda pendentes.
- Um erro de compra/venda coloca a operação em espera temporária com backoff progressivo e depois permite nova tentativa idempotente, em vez de bloquear a sessão inteira.
- O Autopilot continua combatendo enquanto aguarda o servidor.
- Compra com CPU AUTO BUY em qualquer setor permitido; sem CPU, apenas na base.
- Sem mudança no orçamento padrão de segurança: 25 milhões CR por sessão, configurável até 250 milhões CR.
- Reserva laser tem cálculo proporcional ao número de lasers equipados, a partir do limite informado.
- Compra automática considera somente munição/míssil selecionado com cotação em CR; não substitui a munição Elite selecionada por outra sem consentimento.
- Diagnóstico do Autopilot registra timestamps de compras/vendas confirmadas e estado do retry.

## Materializador
- Prêmios com ID antigo (`plt2026`, `plt2021`, `r310`) são exibidos como produtos (`CMT-2`, `CMT-3`, `CMT-1`).
- Munição: `lcb10` => `PLS-1`, `mcb25` => `PLS-2` etc.
- Se o catálogo online oferecer `display_name`, ele tem prioridade; itens sem correspondência preservam rótulo recebido.
- Apenas nomes de exibição, sem mudar chances, recompensas, quantidade, preço ou RNG.

## Proteções e validações
- Farm Offline, contas, missões, CONF1/CONF2, aux, eventos, PvP, clãs, relés e leilão preservados.
- 435 testes automatizados aprovados, auditoria sem imports faltantes, validação de JavaScript e instalação simulada.
- NÃO significa homologação em produção: validar uma venda e uma compra automáticas com valores pequenos após deploy.

## Como instalar
1. Faça backup da branch main.
2. Envie este ZIP (sem descompactar) para a raiz do repositório.
3. Execute o workflow do Instalador Universal.
4. Aguarde deploy no Render e reinicie o PWA no Android (cache atualizado).
5. Teste com munição próxima ao limite escolhido e porão próximo de 85%; verifique CR, inventário e log de diagnóstico.
