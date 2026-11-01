# V114.1 — Clãs, guerra e relés

## Entrega isolada

- Revalida que o agente capturador está vivo, presente, dentro do círculo do relé e (em relés de clã) tem clã antes de iniciar a confirmação ao banco.
- Clãs rivais dentro do mesmo círculo contestam o ponto, mesmo pertencendo à mesma facção.
- Torres de relé não atacam aliados do clã proprietário. Relés legados sem owner_clan_id respeitam a facção proprietária. Jogadores protegidos pelo portal continuam intocáveis.
- Persistência, débito de equipamentos e domínio permanecem exclusivamente no Supabase. Erros/timeout continuam com reconciliação V346 em vez de conceder propriedade provisória.

## Aceite

Dois clãs de mesma facção contestam um relé. A captura não se inicia por jogador ausente ou fora da área. Um defensor do clã proprietário não recebe tiro da própria torre; um invasor recebe. Após erro de banco, o proprietário não muda até a confirmação oficial.
