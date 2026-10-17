# Stellar Legacy — blindagem do caminho de salvamento (V22.7.0)

**Instalação em duas etapas — NÃO aplicar a etapa B antes do novo Render subir.**

## Estado do Supabase

- **Etapa A / GRANT para `service_role`**: aplicada e verificada neste projeto.
- **Etapa B / bloqueio do REST direto**: propositalmente **pendente**, para não interromper a versão antiga.
- Saves, personagens, clãs e donos dos relés não são migrados/resetados por nenhum desses scripts.

## Publicação segura

1. Faça upload do ZIP **V22.7.0** na raiz do repositório e execute `Actions → Instalar versão do Stellar Legacy → Run workflow`.
2. Aguarde o deploy no Render. Confirme em `/health` a versão **22.7.0**.
3. Faça login em uma **conta de teste**, salve o jogo e realize uma compra pequena com CR em `/api/live/purchase` pela interface normal. Reabra a conta e confira a persistência. Sem exigir SQL B ainda.
4. Somente depois do passo 3, execute `sql/STELLAR_V22_7_0_SERVER_WRITE_GATE.sql` no projeto Supabase (etapa B). Peça ao ChatGPT para executar se desejar; a migração **não foi aplicada antecipadamente**.
5. Confirme que `authenticated` NÃO pode mais `INSERT/UPDATE` em `game_saves`, que só pode alterar os campos não econômicos autorizados em `profiles`, e que o `service_role` continua podendo gravar.
6. Faça outro teste de save/login/loja, além de Elite, cupons, clãs, Arena, PvP e configurações de nave.

## Comportamento novo

- Escritas HTTP de `game_saves` e espelho de moedas/perfil usam cliente privilegiado **somente no Render**.
- Compras HTTP incrementam `serverPurchaseRevision`. Saves antigos retornam `SAVE_ECONOMY_STALE`, levando o cliente a sincronizar de novo.
- O trigger SQL impede o recuo e saltos impossíveis dessa revisão.
- Flooding de dano NPC tem limite por conexão, rejeição de IDs repetidos, verificação de sessão, e não produz autoban por lag.
- `SUPABASE_SERVICE_ROLE_KEY` permanece secreta; não está no ZIP.

## Limites honestos desta fase

O navegador ainda calcula recompensas de **missões legadas, caixas, exploração, eventos e certos drops**; o servidor ainda valida parte dessas alterações por regras conservadoras, não por comprovante de evento de ponta a ponta. O motor de dano também ainda usa um valor informado pelo cliente, com limite server-side. **Não habilite venda com dinheiro real ainda.** A fase seguinte deve migrar os geradores e resgates restantes para transações atomizadas e comprovantes de evento emitidos exclusivamente pelo servidor.

## Se ocorrer problema após a etapa B

Reverta a restrição explicitamente (manutenção temporária, exigindo revisão e log):

```sql
GRANT INSERT,UPDATE ON public.game_saves TO authenticated;
GRANT INSERT,UPDATE ON public.profiles TO authenticated;
```

Use apenas para emergência enquanto corrige o deploy, e reaplique o SQL B depois. É preferível voltar para o último pacote conhecido e agendar a migração corretamente. **Nunca exponha a chave `service_role` no cliente.**
