# Stellar Legacy V18.2.16 — Login com Google (OAuth)

## Implementação
- Botão **CONTINUAR COM GOOGLE** na tela de entrada e criação de conta.
- OAuth pelo Supabase Auth com redirecionamento na mesma aba e limpeza imediata de tokens da URL.
- Validação do token no servidor com `sb.auth.getUser()`, checagem de identidade Google, bloqueio de contas banidas e integração com `register_game_session_v1214`.
- Mantém uma sessão única por conta; refresh, save, créditos, inventário e ADM continuam usando a identidade existente por user_id.
- Para contas existentes, **usar o mesmo endereço de e-mail verificado**. Supabase suporta vinculação automática de identidades do mesmo e-mail, sob as condições da documentação oficial.
- E-mail/senha continuam habilitados como método de recuperação/fallback. A página não faz login automático ao recarregar, exceto para concluir um retorno OAuth iniciado nessa aba.
- Nenhuma tabela SQL nem política de save foi alterada.

## CONFIGURAÇÃO EXTERNA OBRIGATÓRIA (não é feita pelo ZIP)
1. No [Google Auth Platform](https://console.cloud.google.com/auth/overview), configurar branding, audiência e escopos `openid`, `userinfo.email`, `userinfo.profile`. No modo teste, adicionar e-mails de testadores; para liberar geral, publicar app OAuth.
2. Em Google Cloud > APIs & Services > Credentials / Clients, criar **OAuth Client ID — Web application**:
   - Authorized JavaScript origin: `https://darkorbit-legacy.onrender.com`
   - Authorized redirect URI: `https://rxcekofbxzivuavtqjwp.supabase.co/auth/v1/callback`
3. No [Supabase](https://supabase.com/dashboard/project/rxcekofbxzivuavtqjwp/auth/providers?provider=Google), habilitar Google e preencher **Client ID + Client Secret**. **Não adicionar segredo ao ZIP/Git/Frontend.**
4. Em [Supabase Auth URL Configuration](https://supabase.com/dashboard/project/rxcekofbxzivuavtqjwp/auth/url-configuration):
   - Site URL: `https://darkorbit-legacy.onrender.com`
   - Redirect URLs: `https://darkorbit-legacy.onrender.com/**` ou, preferencialmente, o endereço específico `https://darkorbit-legacy.onrender.com/` utilizado pelo jogo.
5. Publicar o ZIP usando o instalador e fazer teste com Google em janela privada e com a mesma conta antiga. Verificar que o callsign e o save antigo permanecem, e testar bloqueio de segundo dispositivo.

Sem ativar o provedor Google e cadastrar o Client ID/Secret no Dashboard, o botão informa configuração pendente e não efetua login.

Documentação: https://supabase.com/docs/guides/auth/social-login/auth-google
Documentação sobre contas existentes: https://supabase.com/docs/guides/auth/auth-identity-linking
