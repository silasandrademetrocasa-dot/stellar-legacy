# V102 — Proteção de pesquisa durante Autopilot + diagnóstico Arena

**Instalação:** `47.7.57` (V101) → `47.7.58` (V102). Não altera o Supabase automaticamente.

## Diagnóstico confirmado

Os logs do Render das 10h31 e 10h53 registraram `POST /api/economy/action` rejeitado por `SAVE_NPC_STALE`. Este erro é provocado por uma gravação de recompensa NPC atualizada pelo banco enquanto outra operação econômica tenta gravar um save já antigo.

Antes, a Árvore do Piloto descontava Créditos e aplicava pontos **primeiro no celular** e chamava `saveGame()` depois. Um save rejeitado por concorrência podia fazer a UI buscar o save remoto e perder a melhoria ainda não confirmada.

## Correções

- Upgrade de habilidade e reset de árvore passaram a usar `/api/economy/action` e validar atributos, limites, pontos de pesquisa, pré-requisitos, créditos e STL **no servidor**.
- Projeção da tabela `profiles` é gravada **somente depois** de `game_saves` confirmar a operação. Falha de projeção após commit não instrui o cliente a comprar novamente.
- Em conflitos conhecidos `SAVE_NPC_STALE`, `SAVE_ORE_STALE`, etc., o servidor refaz a leitura do **novo** save e recalcula a operação em até 3 tentativas, sem reaplicar uma cobrança que já foi confirmada. Em erro não recuperável a compra é recusada.
- Uma compra só é exibida como concluída após o servidor confirmar o save atualizado.
- A Arena mostra o contador retornado pela RPC e, após nova leitura, avisa se uma batalha registrada não reduziu os ataques diários.

## Pendente de banco / limites

A função PostgreSQL `arena_attack_v11` e o registro diário da conta ADM **não foram auditados diretamente**: o projeto Supabase `stellar-legacy` não está acessível nesta sessão de conexão. Portanto, esta entrega **não promete corrigir a regra de abatimento da Arena no banco**. A interface não deve fingir que uma batalha consumiu tentativa quando o banco diz o contrário. Inspecionar a função e regra de exceção administrativa assim que a conexão correta estiver disponível.

Não foi executado SQL, não foram concedidas moedas, não foram alteradas recompensas ou habilidades de contas já existentes.

## Como testar no celular

1. Instalar V102 e gerar novo APK. Usar a versão `47.7.58`.
2. Em X-5, deixar Autopilot ativo e converter um PP / evoluir uma habilidade (ex.: Casco I). Fechar e reabrir o APK para confirmar persistência do nível e saldo.
3. Repetir com outra habilidade e observar que só uma cobrança foi aplicada.
4. Na Arena, anotar ataques restantes antes e após uma partida, usando uma conta normal se possível. Se a tela alertar que o contador não diminuiu, registrar o resultado: precisa da função `arena_attack_v11` no Supabase correto.
5. Verificar no Render se existem novos `SAVE_NPC_STALE` e o diagnóstico `[economy-v102]` (até 3 tentativas).

**Rollback:** volta o código da V102 para V101 e não altera o banco. Reverter depois de uma compra confirmada não deve desfazer o save econômico.
