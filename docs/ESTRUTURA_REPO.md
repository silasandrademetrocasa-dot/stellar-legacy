# Stellar Legacy — estrutura segura a partir da V90

| Pasta | Responsabilidade |
|---|---|
| `public/` | Aplicação Web, JS/CSS, imagens, mapas JSON, audio e fontes. **A mesma pasta é empacotada no APK**. |
| `public/assets/` | Referências por URL absoluta `/assets/...`; **não mover** arte sem atualizar código, manifests e testes. |
| `server/` | Express, WebSocket, gameplay e economia autoritativa em Render. **NÃO empacotar no APK**. |
| `android/` | Invólucro Android WebView com assets HTTPS locais, SDK e Gradle. |
| `scripts/` | Validação, inventário Web/APK e instalador universal. |
| `tests/` | Testes de regressão Web; testes APK em `scripts/verify-apk.js`. |
| `sql/` | Histórico SQL. Nunca enviado ao celular como código executável. |
| `docs/archive/` | Documentos de releases anteriores sem poluir a raiz Git. |
| `docs/balance/v81/` | Snapshots locais para referência, não execução automática no banco. |
| `.github/workflows/` | CI, installer e APK (protegidos do Instalador Universal). |

## Limpeza realizada
- Movidos documentos históricos da raiz para `docs/archive/` (conteúdo preservado).
- Movidos dados históricos V81 para `docs/balance/v81/`.
- Removidos `.gitkeep` de assets (arquivos vazios não usados pelo jogo).
- Não removidos sprites duplicados/legados sem análise de referências dinâmicas.
- Nenhuma API, save, economia, NPC, scripts ativos do game ou arte de runtime relocados.
