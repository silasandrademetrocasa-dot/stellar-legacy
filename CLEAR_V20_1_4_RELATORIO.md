# Auditoria — Stellar Legacy V20.1.4 CLEAR

Fonte: `stellar-legacy-V20.1.4-CONF-NAVE-MOBILE(2).zip` (Biblioteca do usuário), compatível com a `main` V20.1.4 do repositório público.

## Resultado

- Arquivos no ZIP de origem: **429**.
- Arquivos removidos: **142**.
- Arquivos adicionados: `CLEAR_V20_1_4_RELATORIO.md` e `REMOCOES_CLEAR.txt`.
- Redução do conteúdo original: **3,253,990 bytes**, aproximadamente **3.10 MiB** (18.2%), antes da recompressão do ZIP. Foram também atualizados apenas `README.md` e `sql/README.md`.
- Código executável principal (cliente, servidor, HTML e CSS) preservado byte a byte; a versão em `package.json` permanece **20.1.4**.

## Remoções por categoria

- Documentação histórica de versões antigas: 27 arquivo(s)
- Documento antigo/redundante: 54 arquivo(s)
- Imagem V8 sem referência no código ativo: 21 arquivo(s)
- SQL duplicado byte a byte: 2 arquivo(s)
- SQL identificado como teste; migrações reais preservadas: 1 arquivo(s)
- Sprite V17 substituído, sem referência no código ativo: 1 arquivo(s)
- Teste de desenvolvimento: 35 arquivo(s)
- Workflow V19.0.6 obsoleto: 1 arquivo(s)

## Pontos críticos preservados

- Toda a estrutura do Render (`render.yaml`, `package.json`, `server/index.js`, `server/world.js`).
- Frontend, módulos da batalha CONF 1/2, assets ativos e os três sprites antigos V8 ainda citados pelo manifesto (mystery-box, repair e energy).
- Supabase: arquivos de migração em `sql/`, incluindo versões atuais e reversões; nenhuma operação executada no banco.
- Fluxos de login, salvamento, loja, ADM e renderização: nenhum arquivo de lógica alterado.

## Validações efetuadas

- Todos os arquivos `.js` de produção (`public/*.js`, `public/assets/v17/manifest.js`, `server/*.js`) passaram em `node --check` com Node 22 antes da limpeza.
- Antes de remover os testes, **151 de 153 testes passaram** no pacote completo. **Duas falhas preexistentes** correspondem exclusivamente a testes legados que esperam `package.json.version === 20.1.0` em um pacote versão `20.1.4`: `tests/mobile-lite-regression.mjs` e `tests/test-aux-ore-v1827.mjs`.
- Os **16 testes** específicos de CONF 1/2, HUD mobile e PvP contínuo passaram.
- As imagens restantes foram confrontadas com caminhos explícitos de uso em cliente/servidor/manifesto.
- A verificação estática não substitui um teste online de Render, Supabase, conta real e mobile após a instalação.

## Limites importantes

Este pacote limpa o **artefato de distribuição**. Não reescreve o histórico do Git para recuperar os 622 MB acumulados em objetos/commits anteriores, não modifica Supabase, e não altera automaticamente o repositório hospedado. O instalador existente preserva o diretório `.github/`; remover workflow obsoleto dessa pasta na `main` requer ação separada no GitHub.

