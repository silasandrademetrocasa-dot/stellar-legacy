# V20.2.0 — Relatório técnico da Etapa 1

**Base:** V20.1.4 CLEAR (ZIP completo). **Sem SQL adicional. Sem reset de progresso.**

### Alterações executáveis

- `public/game.js`: migra perfis gráficos e seleção da qualidade AUTO para import puro, com assinatura injetável e testes. Imports locais atualizados para `?v=20.2.0` a fim de evitar misturar versões no cache.
- `public/modules/quality-profiles.js`: primeiro módulo extraído; funções puras, independente de navegador e de Supabase.
- `public/index.html`: versão do CSS e game.js atualizada.
- `server/index.js`: versão dos três endpoints unificada em `RELEASE_VERSION`.
- `package.json`: adiciona `npm run check`, `npm test` e `npm run verify`.
- `render.yaml`: falha a construção se a verificação ou regressões falharem, antes da publicação.
- `scripts/verify-release.mjs`: verifica assets, imports, HTML IDs, sintaxe JS, consistência de versão e Render.
- `tests/`: 16 regressões selecionadas da versão anterior e 1 suite nova para qualidade AUTO.

### Sem alteração

- `public/api.js`, `public/data.js`, `public/combat-config-v2013.js`, `public/repair-balance.js`, `server/world.js`, migrações SQL, inventário, fórmulas de batalha, temporizador de 5 segundos, escudos salvos por configuração, saldo e backend Supabase.

### Restrições

- Testes automáticos **não** fazem chamadas reais ao Supabase, não simulam dispositivos Android e não substituem smoke test com login no Render.
- A checagem no Render acontece **depois do upload do ZIP** e instalação na `main`, mas **antes de uma nova implantação**. Para evitar publicar ZIP com erros, `npm run verify` também é executado antes de gerar o pacote.
- Se o Render falhar na etapa de build, a alteração pode continuar na `main` (o workflow de ZIP instala/commita antes do deploy). Neste caso, fazer rollback para o commit anterior ou usar o ZIP CLEAR anterior.

### Resultado da validação local

- `npm run verify`: **PASSOU**.
- 30 arquivos JavaScript avaliados por `node --check`.
- 216 caminhos gráficos referenciados e presentes.
- 120 testes passaram; 0 falharam, 0 pulados.
- O conjunto de testes é local e não acessou um serviço Render real ou banco Supabase real.

### Atenção ao comando de build

`render.yaml` define `npm install && npm run verify`, mas alguns serviços Render existentes possuem um Build Command próprio em Settings e não reaplicam automaticamente mudanças do Blueprint. Confirme no painel do Render após a instalação. A conexão Render não foi alterada nesta entrega.
