# Stellar Legacy — WEB + APK Local

Jogo multiplayer, versão web **47.7.46 (V90)**. O APK Android possui **todos os arquivos estáticos dentro do aplicativo**, mas autenticação, multiplayer, saves, balanceamento e economia continuam online.

## Pastas
- `public/` — aplicação web completa e recursos empacotados no Android.
- `server/` — API REST e WebSocket no Render (nunca no APK).
- `android/` — projeto nativo Android para o APK local.
- `scripts/` — verificações Web/APK e Instalador Universal.
- `sql/` — histórico de SQL; **não é uma etapa do APK**.
- `docs/` — documentação e histórico organizados. Leia `docs/ESTRUTURA_REPO.md`.
- `tests/` — regressões do jogo.

## Verificar e gerar APK no GitHub
1. Envie a atualização de APK pelo **Instalador Universal** (base V90 `47.7.46`).
2. Configure a variável Actions `STELLAR_SERVER_URL` para `https://darkorbit-legacy.onrender.com` (sem `/` no final) se ainda não estiver configurada.
3. Em Actions, abra **Stellar Legacy — APK Local** e execute `Run workflow`.
4. Baixe o artifact APK debug. Para release assinado, configure os 4 secrets `STELLAR_KEYSTORE_*` e marque release.
5. Leia `docs/ANDROID_APK_LOCAL.md` para arquitetura, limites e prova de economia de banda.

## Web e deploy
Use `npm run verify` antes de publicar. O workflow Instalador Universal aceita **um ZIP na raiz** e protege `.github/workflows` de alterações automáticas.
