# RELATÓRIO — V22.9.5

## Objetivo
Melhorar a ergonomia do HUD no mobile, principalmente a área inferior de combate, evitando sobreposição e facilitando a troca de munições e mísseis.

## Entregas
- Reorganização estrutural da barra inferior de combate.
- Separação visual de lasers e mísseis.
- Botão de habilidade principal reduzido para um quadrado compacto.
- Retirada do botão de Kamikaze do rodapé; uso fica concentrado no AUX-9.
- Persistência do comportamento recolhido da barra.
- Teste automatizado cobrindo a nova organização.

## Arquivos principais alterados
- `public/index.html`
- `public/style.css`
- `package.json`
- `tests/v2295-weaponbar-layout.test.mjs`
- `CHANGELOG.md`

## Impacto
- Sem mudança de SQL.
- Sem alteração de progressão, economia ou backend.
- Alteração focada no frontend / HUD.
