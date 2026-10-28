# Stellar Legacy V101 — login persistente no APK

Versão 47.7.57 (sobre V100 / 47.7.56). Atualização dos arquivos WEB locais e projeto Android, sem alterações em saves, economia, Render ou Supabase.

## Comportamento

- **APK Android:** há a opção **Manter conectado no APK (sessão criptografada)**, marcada por padrão. Depois de efetuar um login válido uma vez, somente o token de renovação e o identificador de sessão do jogo são salvos **criptografados com AES-256-GCM via Android Keystore** nas preferências privadas do aplicativo, sem backup. A senha não é armazenada.
- **Reabertura:** o APK recupera a credencial do cofre, solicita ao **Render** a renovação via `/api/auth/refresh` e verifica a identidade via `/api/auth/me`. Somente depois entra no jogo e baixa o save. A segurança de sessão única e o bloqueio de contas permanecem.
- **Site Web:** o navegador permite lembrar **somente o e-mail**, se o jogador desejar. A sessão do navegador não é persistida entre fechamentos de aba por localStorage.
- **Conta trocada / sessão revogada:** o servidor rejeita a sessão antiga; o APK apaga o registro criptografado e pede login novamente.
- **SAIR:** encerra a sessão no backend e apaga as credenciais armazenadas, sem apagar saves. Desmarcar **Manter conectado** também limpa o cofre, sem deslogar a sessão em andamento.
- **Rede instável:** perda temporária de conexão não apaga o cofre. Na tela de login pode-se tentar reconectar. Sem rede, login automático não é possível porque o servidor precisa confirmar a autorização.
- **E-mail:** a opção separada **Lembrar meu e-mail** não grava senha nem tokens.

## Instalador / APK

1. Confirme V100 (`47.7.56`) no GitHub.
2. Envie somente o ZIP V101 à raiz e rode o **Instalador Universal**. A versão final será `47.7.57`.
3. Faça deploy do Render e rode o workflow **APK Local** para obter o binário Android atualizado. A ponte nativa não estará disponível no APK antigo, mesmo que o navegador mostre a nova tela.
4. Entre uma vez no APK novo, com a opção **Manter conectado** marcada. Feche o processo do APK, reabra com internet e confira o auto-login.
5. Faça **SAIR**, reabra e confirme que exige login. Depois tente entrar em outra conta para garantir a política de sessão única.

## Segurança e limitações

A credencial guardada é um token de renovação, não uma senha; a criptografia reduz exposição a extração de arquivos locais, mas um aparelho comprometido ou JavaScript malicioso poderia colocar a conta em risco durante a sessão ativa. O token não é guardado em localStorage. Recomenda-se manter Android/WebView atualizados. Reinstalar ou limpar os dados do aplicativo apaga a sessão salva. Um APK assinado com chave diferente pode exigir desinstalação do anterior.

## Validação

Testes automatizados simulam login, reinício do WebView, renovação e validação via backend, sessão substituída, rede indisponível, logout e preferências de e-mail. Não substituem instalação e teste no Android real. Nenhuma conta de produção foi acessada.
