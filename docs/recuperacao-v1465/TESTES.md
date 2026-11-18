# Resultado da recuperação

O instalador original do ZIP recebido foi executado sequencialmente sobre uma cópia do mesmo projeto. Parte 1 removeu exatamente 2.728 arquivos e parte 2 aplicou o reparo. Os dois atalhos corretos em node_modules/.bin foram preservados, inclusive no teste com os links simbólicos originais do ZIP.

Todos os 2.727 arquivos de dependências soltos na raiz coincidem byte a byte com arquivos do node_modules do ZIP anterior. A lista de remoção contém somente esses arquivos e um cache Python gerado. Nenhum arquivo de arte foi alterado. Todas as demais mudanças do usuário, incluindo conexões e Android, foram preservadas.

Após a limpeza, npm ci reinstalou 114 pacotes usando o lock existente. A primeira tentativa sem rede encontrou um pacote ausente do cache; a instalação normal pela rede concluiu com sucesso. npm run verify: 327 testes, 326 aprovados, zero falhas e um ignorado por falta de JDK.

Os pacotes finais foram testados com o instalador e seus arquivos conferidos byte a byte. A versão permanece 47.8.5. Não houve deploy ou escrita no banco. Não foi gerado APK nem executado gameplay autenticado em produção nesta verificação.
