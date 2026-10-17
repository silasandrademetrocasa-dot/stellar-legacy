# Stellar Legacy — V20.2.0 FUNDAÇÃO (Etapa 1)

Release completa baseada na **V20.1.4 CLEAR**, mantendo combate, dados/saves, API, lojas, eventos e Supabase. **Nenhum SQL novo.**

## O que muda

1. **Primeira separação do monolito:** perfis gráficos e escolha de qualidade automática isolados em `public/modules/quality-profiles.js`; valores e comportamento da V20.1.4 mantidos.
2. **Testes regressivos mantidos:** uma suíte pequena e escolhida de 17 arquivos verifica CONF 1/2 e escudos, HUD mobile, PvP, progressão, ADM/segurança, leilão, compras, reparação e qualidade. Sem testes históricos obsoletos.
3. **Verificação de release automática no Render:** `npm run verify` valida sintaxe, imports locais, 216 assets, IDs de HTML, versionamento e regressões. O `render.yaml` roda esse comando **na compilação, antes de publicar**.
4. **Versão padronizada:** V20.2.0 no package.json, URLs de cache de JS/CSS e nos três endpoints HTTP de status. Nada foi alterado nas regras online.

## Como instalar (ZIP completo)

1. Suba somente o arquivo `stellar-legacy-V20.2.0-FUNDACAO-ETAPA1.zip` para a raiz do GitHub, **sem extrair**, removendo outros ZIPs `stellar-legacy*.zip` da raiz.
2. GitHub → **Actions** → **Instalar versão do Stellar Legacy** → **Run workflow**.
3. Em um serviço Render **já existente**, confirme em **Settings → Build Command** que o comando é `npm install && npm run verify` (o `render.yaml` nem sempre atualiza automaticamente serviços criados fora de Blueprints). Acompanhe o deploy e confirme que `/health` exibe `20.2.0`.
4. Teste **login, posição da nave após F5, CONF 1/2 com escudo danificado, NPCs, loja, PvP, celular e ADM** com sua conta. Os testes estáticos não substituem testes no jogo real.

**Importante:** O instalador existente preserva `.github/`. Ele já basta para esta atualização: a validação acontece no `render.yaml`, não depende de substituir um workflow do GitHub. Este ZIP **não altera o banco Supabase**, e nem suas contas. **Não execute SQL antigo outra vez.**

## Desenvolvimento futuro

- `npm install`
- `npm run check` — verificação estática, sem rede.
- `npm test` — testes automáticos, sem login ou Supabase real.
- `npm run verify` — roda check + testes.
- `npm start` — servidor.

Próxima etapa recomendada: extrair cache/carregamento de imagens e telemetria do monolito **separadamente**, mantendo testes ao redor de cada mudança.

Consulte `V20_2_0_RELATORIO.md` para resultados e limites dos testes.
