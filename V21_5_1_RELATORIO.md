# Stellar Legacy — Correção de sincronização PvP

## Sintoma
- WARFRONT fica em “Sincronizando setor...” e A/B/C não aparecem quando o PvP não conclui a entrada na sala.
- Eventos compartilhados também não são entregues porque dependem do mesmo snapshot WebSocket.

## Causa e correção
- O servidor bloqueia a entrada na sala se a leitura autoritativa dos relés falha, como quando o Render não tem acesso à chave privada do Supabase.
- O cliente não tratava `join_error` e confundia `pong` com online pleno, deixando o painel sem explicação.
- Agora o motivo de falha é visível; botão RECONECTAR solicita nova entrada; cada relé pode ser apresentado em **modo somente leitura** consultando o banco com JWT autenticado, sem criar conquistas falsas.
- A/B/C aparecem no WARFRONT, no mapa e no minimapa a partir do estado verdadeiro do banco, mesmo durante interrupções da sala PvP. Eventos online e captura só funcionam quando o WebSocket consegue sincronizar com servidor de jogo.

## Migração aplicada no Supabase
`sql/V21_5_1_RELAY_READONLY.sql` — SELECT restrito a campos públicos de posse para jogadores autenticados, RLS ligado. Proibidas escritas pelo navegador.
Banco verificado após aplicação: 9 relés; 5 saves; 0 concessões de UPDATE ao authenticated; 0 leituras do campo owner ao anon.

## Verificação
- 234 testes passaram sem falhas.
- Assets checados: 216 referências.
- Sem alterações nas regras de combate, SQL de premiação, nas capturas do servidor, ou nos saves.
- Nenhum arquivo do pacote V21.5.0 foi removido.

## Atenção Render
Confirme `SUPABASE_SERVICE_ROLE_KEY` configurada no **ambiente privado do serviço Render** e reinicie/deploy. **Nunca envie a chave pelo chat ou GitHub.** A migração sozinha não autoriza escrever capturas pelo navegador. Não há evidência de que o Render já esteja corretamente configurado; o funcionamento multiplayer ainda requer validação pós-deploy.
