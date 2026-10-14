# V19.0.9 — Balanceamento online de naves e equipamentos

A nova aba **ADM → BALANCEAMENTO** integra o catálogo já existente (`public/data.js`)
à configuração publicada pelo Supabase. Não altera a lógica de habilidades especiais,
os sprites, a loja, os itens de evento, os preços ou a autenticação.

## Arquitetura

- `game_balance_entries_v1909`: 43 naves e 36 itens, instalados com dados originais.
- `game_balance_meta_v1909`: versão monotônica que impede gravações concorrentes obsoletas.
- `get_balance_runtime_v1909()`: leitura autenticada de configurações.
- `admin_set_balance_v1909()`: gravação autenticada e autorizada pelo `is_game_admin_v1763()`.
- Servidor expõe `GET /api/runtime/balance` e `POST /api/admin/runtime/balance`.
- Cliente mantém fallback da V19.0.8 e cache local caso o Supabase esteja temporariamente indisponível.
- Clientes autenticados sincronizam em até 45 segundos; atributos alterados atualizam o piloto em uso.

## Limites importantes

- Os slots de naves que diminuírem passam pelo reconciliador do Hangar;
  lasers, geradores e extras removidos por excesso voltam ao inventário.
- Os drones existentes são reconciliados com o novo número de slots.
- O cálculo de HP e escudo preserva o percentual restante ao atualizar os atributos.
- Os preços são configurados exclusivamente em PREÇOS; não se misturam com balanceamento.
- A disponibilidade para comprar navios em eventos continua ligada às regras existentes;
  o editor não libera automaticamente uma nave de evento gratuitamente.
- Habilidades especiais, sprites e desenho de novos equipamentos não são dados do balanceamento.

## Instalação

O SQL de `sql/V19_0_9_ADM_BALANCEAMENTO.sql` já foi aplicado no projeto Supabase
`stellar-legacy` antes da publicação do ZIP. Envie o ZIP completo para a raiz do
GitHub e execute o instalador principal atual, sem substituí-lo.
