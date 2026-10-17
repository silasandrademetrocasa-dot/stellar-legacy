# STELLAR LEGACY V20.2.3 — OTIMIZAÇÃO GRÁFICA

ZIP completo baseado na V20.2.2. Leia `V20_2_3_RELATORIO.md` para mudanças e testes. Nenhum SQL novo.

# Stellar Legacy — V20.2.2 MONITOR DE DESEMPENHO (Etapa 3)

Release completa baseada na **V20.2.1 MOTOR GRÁFICO E CACHE**. **Sem SQL novo, sem mudanças no combate nem nos saves.**

## Nesta atualização

- Abra **CONF → JOGO → DIAGNÓSTICO DE DESEMPENHO**. A medição local é opcional e vem desligada por padrão.
- Mostra FPS observado, intervalo p95 entre quadros, tempo p95 de `update` + `draw`, quadros longos, imagens no cache e memória heap JS do navegador quando disponível.
- HUD compacto opcional de FPS e botão *Copiar relatório técnico*: dados copiados manualmente ao clipboard, nunca enviados automaticamente.
- No máximo 240 amostras; evita contar troca de aba como engasgo.
- Perfil de qualidade AUTO e proteção de sprites de naves/NPC/AUX mantidos.

**Instalação:** um ZIP completo na raiz do GitHub, execute `Actions → Instalar versão do Stellar Legacy → Run workflow` (remova ZIPs anteriores da raiz). Confirme versão `20.2.2` em `/health`. Sem SQL adicional.

Leia `V20_2_2_RELATORIO.md`. Histórico abaixo.

---

# Stellar Legacy — V20.2.1 MOTOR GRÁFICO (Etapa 2)

Release completa baseada na **V20.2.0 FUNDAÇÃO**, mantendo combate, dados/saves, API, lojas, eventos e Supabase. **Nenhum SQL novo.**

## V20.2.1 — O que foi melhorado

- Gerenciador de imagens extraído para `public/modules/asset-cache.js`, preservando nave/NPC/AUX e mesmo desenho do canvas.
- Fundo de mapa antigo liberado do cache após 90 s sem uso; imagens extras liberadas após 20 s se acima do limite.
- Retry de imagens com falha após 15 s, sem requisitar novamente a cada frame.
- Novos testes unitários de cache; nenhuma mudança em banco, combate ou saves.
- Consulte `V20_2_1_RELATORIO.md`.

## Histórico V20.2.0

1. **Separação prévia do monolito:** perfis gráficos e escolha de qualidade automática isolados em `public/modules/quality-profiles.js`; valores e comportamento da V20.1.4 mantidos.
2. **Testes regressivos mantidos:** uma suíte pequena e escolhida de 17 arquivos verifica CONF 1/2 e escudos, HUD mobile, PvP, progressão, ADM/segurança, leilão, compras, reparação e qualidade. Sem testes históricos obsoletos.
3. **Verificação de release automática no Render:** `npm run verify` valida sintaxe, imports locais, 216 assets, IDs de HTML, versionamento e regressões. O `render.yaml` roda esse comando **na compilação, antes de publicar**.
4. **Na etapa anterior, versão padronizada:** V20.2.0 no package.json, URLs de cache de JS/CSS e nos três endpoints HTTP de status. Nada foi alterado nas regras online.

## Como instalar (ZIP completo)

1. Suba somente o arquivo `stellar-legacy-V20.2.1-MOTOR-GRAFICO-CACHE.zip` para a raiz do GitHub, **sem extrair**, removendo outros ZIPs `stellar-legacy*.zip` da raiz.
2. GitHub → **Actions** → **Instalar versão do Stellar Legacy** → **Run workflow**.
3. Em um serviço Render **já existente**, confirme em **Settings → Build Command** que o comando é `npm install && npm run verify` (o `render.yaml` nem sempre atualiza automaticamente serviços criados fora de Blueprints). Acompanhe o deploy e confirme que `/health` exibe `20.2.1`.
4. Teste **login, posição da nave após F5, CONF 1/2 com escudo danificado, NPCs, loja, PvP, celular e ADM** com sua conta. Os testes estáticos não substituem testes no jogo real.

**Importante:** O instalador existente preserva `.github/`. Ele já basta para esta atualização: a validação acontece no `render.yaml`, não depende de substituir um workflow do GitHub. Este ZIP **não altera o banco Supabase**, e nem suas contas. **Não execute SQL antigo outra vez.**

## Desenvolvimento futuro

- `npm install`
- `npm run check` — verificação estática, sem rede.
- `npm test` — testes automáticos, sem login ou Supabase real.
- `npm run verify` — roda check + testes.
- `npm start` — servidor.

Próxima etapa recomendada: telemetria de FPS e estabilidade por dispositivo, com observação antes de alterações de renderização.

Consulte `V20_2_1_RELATORIO.md` para a atualização atual e `V20_2_0_RELATORIO.md` para a etapa anterior.
