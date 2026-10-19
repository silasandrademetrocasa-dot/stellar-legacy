# Instalador Universal Stellar Legacy

Substitua **somente** `.github/workflows/stellar-installer-main.yml` e adicione `scripts/stellar-universal-installer.py` ao GitHub **uma única vez**. Depois, o fluxo automático aceita um ZIP por execução, na raiz do repositório.

**ZIP completo**: contém `package.json`, `public/game.js`, `public/api.js`, `public/data.js`, `server/index.js`. Detectado automaticamente como `full`; arquivos antigos em `public/`, `server/`, `sql/` e `tests/` que não aparecem no ZIP serão excluídos. NÃO envia `.github` no pacote.

**ZIP de atualização**: inclui `stellar-install.json` com `{"type":"update","baseVersion":"30.1.2"}` e os arquivos alterados. Preserva todos os arquivos não citados.

**Patch**: arquivos alterados sem manifesto são detectados como `patch`; não apaga outros. Adicione `stellar-install.json` com `{"type":"patch","baseVersion":"30.1.2","delete":["public/arquivo-antigo.js"]}` para exclusões explícitas. O campo `baseVersion` é opcional, mas recomendado.

**Versões:** não edite `package.json` em patch apenas para mudar o número se `public/index.html`, `server/index.js` e imports ainda estiverem na versão antiga; a verificação de release bloqueará o deploy. Pacotes completos devem manter todas as referências sincronizadas.

**Segurança:** bloqueia traversal, symlink, sobrescrita de `.github` e do próprio instalador; limita tamanho expandido; valida sintaxe, consistência do release e testes antes de publicar. `git push` só ocorre após validações. Como qualquer workflow GitHub, esta instalação não é uma transação atômica contra falhas na etapa final de push.
