# ZIP atualizado do usuário, em 7 partes

Origem: stellar-legacy-main(20261118-191043).zip. O próprio arquivo declara versão 47.8.4; esse conteúdo foi preservado sem aplicar V146.5 de outra entrega.

Todos os 2.866 arquivos de node_modules do ZIP original estão incluídos, dentro de node_modules, na parte 01. Todos os demais arquivos de aplicação/artes estão distribuídos nas partes restantes com seus caminhos originais. Não são pedaços binários que precisam ser unidos: cada ZIP é uma atualização independente aceita pelo instalador existente.

1. Faça backup do repositório atual.
2. Envie apenas a PARTE_01 para a raiz, sem extrair, e execute Stellar Legacy — Instalador Universal. Aguarde sucesso.
3. Repita com PARTE_02 até PARTE_07, sempre um ZIP por vez na ordem numérica. Não envie todas juntas; o workflow exige exatamente um ZIP na raiz.
4. Confira o teste final antes de gerar o APK. Cada pacote mede menos de 25.000.000 bytes.

A primeira parte remove as 2.727 cópias indevidas de dependências soltas na raiz encontradas na instalação anterior e um cache Python gerado. A pasta node_modules correta é fornecida integralmente. A remoção é por lista exata, sem apagar pastas inteiras. As artes não são removidas entre as partes.

Os dois workflows em .github e scripts/stellar-universal-installer.py já existentes são preservados, porque o instalador proíbe substituí-los. O README da raiz é preservado pela regra do instalador. Apenas o cache Python __pycache__ fica de fora como arquivo gerado. A lista detalhada está em ORIGEM_E_ARQUIVOS.json.

A preservação inclui SQL; nenhum SQL é executado pelos pacotes. Não foi realizado deploy nesta preparação. Quando você executar o workflow no GitHub, ele testa e faz commit/push, podendo acionar seu deploy automático. Reverter: recuperar os commits/backup anteriores. Não apague dados locais de jogador ou filas de sincronização.
