# Stellar Legacy — V20.1.4 CLEAR

**Edição de limpeza do repositório, sem alterações na lógica do jogo.**

Versão funcional preservada: `20.1.4` (inclui as configurações táticas CONF 1/2 e os botões na aba NAVE do celular).

## O que esta edição faz

- Remove testes temporários de desenvolvimento, relatórios antigos redundantes, arquivos de testes SQL e imagens substituídas não referenciadas pelo código atual.
- Preserva integralmente os arquivos de jogo (`public/`), API/servidor (`server/`), assets utilizados, configuracões do Render e histórico `CHANGELOG.md`.
- Preserva as migrações SQL de produção, scripts de reversão e o snapshot `sql/CURRENT_BACKEND.sql` para recuperação/continuidade do Supabase.
- Mantém o instalador automático `.github/workflows/stellar-installer-main.yml`.
- Não executa SQL e não altera registros, saves, inventário, jogadores ou contas.

## Como instalar o ZIP completo pelo GitHub

1. Deixe somente **este ZIP** (sem extrair) na raiz do repositório, com nome começando por `stellar-legacy`.
2. Em **Actions**, execute manualmente o workflow **Instalar versão do Stellar Legacy** (`stellar-installer-main.yml`).
3. O instalador extrai o conteúdo, valida os arquivos necessários, substitui o código e efetua o commit na `main`.
4. Acompanhe o deploy do Render, limpe/atualize o cache no navegador e valide login, mapa, NPCs, CONF 1/2 e loja.

**Atenção:** O instalador utiliza `rsync --delete` na raiz e preserva `.github/` por exclusão. Se quiser eliminar o workflow antigo `.github/workflows/main.yml` da `main`, exclua esse arquivo pelo GitHub separadamente. A versão CLEAR omite esse workflow legado do pacote.

## Inicialização local / Render

- Node.js 18 ou superior.
- `npm install`
- `npm start`
- Render: `render.yaml` configura `npm install`, `npm start` e health check `/health`.
- Segredos reais nunca devem ser colocados no ZIP; utilize variáveis de ambiente no Render.

## Organização

- `public/` — HTML, CSS, cliente web e imagens em uso, incluindo assets de versões antigas **ainda referenciados**.
- `server/` — servidor de API e simulação de mundo.
- `sql/` — snapshot, migrações e reversões do Supabase (não executar em lote novamente).
- `.github/workflows/stellar-installer-main.yml` — instalador oficial por ZIP.
- `CHANGELOG.md` — histórico geral; `V20_1_3_CONFIGURACOES_TATICAS.md` e `V20_1_4_CONF_NO_PAINEL_NAVE.md` registram a mecânica mais recente.
- `CLEAR_V20_1_4_RELATORIO.md` e `REMOCOES_CLEAR.txt` — auditoria desta limpeza.

**Nota:** eliminar arquivos de um ZIP/release não reescreve nem reduz o histórico antigo do GitHub, nem o banco de dados remoto. Histórico anterior pode ser recuperado em commits/ZIPs antigos.
