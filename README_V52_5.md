# Stellar Legacy — V52.5 Clean Visual

Jogo web multiplayer; base consolidada do GitHub fornecida pelo proprietário em 23/10/2026.

## Executar

- `npm install`
- `npm run verify`
- `npm start`

## Identidade visual

- 13 naves 3D e sprites 2D top-down oficiais: `public/assets/ships3d/v50/` e `public/assets/v52_4/ships/`.
- AUX-9 e NPCs 3D DARK: `public/assets/v52_3/models/`, com 2D atualizado em `public/assets/v52_4/`.
- Cristais e boxes: `public/assets/v52_3/models/` e `public/assets/v52_3/cards/`.
- Configurações: **Visual do jogo — AUTOMÁTICO / 3D / 2D**, seleção única para todos os elementos.
- Fallback 2D preserva arte nova; WebGL2 depende de suporte do dispositivo.

## Banco de dados

`sql/STELLAR_LEGACY_SQL_HISTORICO_UNICO.sql` é um arquivo de auditoria com versões SQL antigas **comentadas**. Não reaplique essas migrações num banco com dados.
A versão V52.5 **não precisa de SQL novo**.

## Verificações

`npm run verify` verifica código, imports, assets e regressões visuais críticas.
Instalação pelo **Instalador Universal** no GitHub Actions; ele aplica o pacote full, substitui os arquivos do runtime e remove os arquivos obsoletos relacionados no manifesto.
