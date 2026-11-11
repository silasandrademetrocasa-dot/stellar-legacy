# V136.1 — correção do Instalador Universal

Este ZIP corrige o bloqueio da instalação V136 na etapa **Validar projeto** do GitHub Actions.

**Causa reproduzida:** o patch V136 original continha 217 arquivos, mas não incluía `stellar-install.json` com exclusões. O instalador aplicou os arquivos e removeu **0** dos sprites legados. O teste `v136-visual-catalog.test.mjs` falhou com `true !== false` para a pasta `v17/ships`.

**Correção:** o manifesto solicita apagar os **317 arquivos antigos**, sem tocar em saves, economia, tabelas, itens, dispositivos, ou assets genéricos. O teste agora verifica que esses 317 arquivos desapareceram e que as 13 pastas antigas não contêm resíduos. Pastas vazias não são versionadas pelo Git e não devem reprovar o teste.

**Instalação:** deixe **apenas este ZIP** na raiz do repositório e execute o workflow **Stellar Legacy — Instalador Universal**. Ele lê `stellar-install.json` e aplica as remoções automaticamente. Não descompacte o ZIP na pasta `.github`.

**Limite:** é uma correção de instalação e limpeza da arte V136. Não é um reparo de problemas de gameplay ou de aparência ainda não verificados no dispositivo. O teste SQL com PGlite precisa das dependências do Node instaladas no GitHub.
