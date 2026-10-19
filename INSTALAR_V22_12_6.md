# STELLAR LEGACY V22.12.6 — INSTALAÇÃO ZIP CORRIGIDO

Este é um pacote completo, com os arquivos diretamente na raiz do ZIP (package.json, public/, server/, sql/, etc.).

## Correção
- Spritesheets AUX-9 mantidos no jogo, convertidos em WebP transparente para reduzir o tamanho do download e preservar os 16 quadros.
- Referências visuais não utilizadas em runtime removidas do pacote de instalação.
- Manifest e teste de sprites atualizados para caminhos WebP.
- Novo nome e versão para evitar instalação de cópia truncada.

## Subir ao GitHub
1. Apague primeiro da raiz do repositório o arquivo ZIP V22.12.5 incompleto (se ele ainda estiver lá), pois o instalador aceita apenas um ZIP.
2. Baixe e envie o novo ZIP V22.12.6 inteiro, SEM extrair, à raiz do GitHub. Verifique que o tamanho do arquivo carregado coincide com o tamanho informado.
3. Execute Actions > Instalar versão do Stellar Legacy > Run workflow.

Nenhuma migração SQL nova é necessária.
