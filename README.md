# STELLAR LEGACY — V20.2.8 (HUD MOBILE OTIMIZADO)

**Base:** V20.2.7 completa, sem migrações SQL.

## Como instalar
1. Termine de verificar a V20.2.7.
2. Coloque o ZIP V20.2.8 na raiz do GitHub como o **único** arquivo `stellar-legacy*.zip` de instalação.
3. Execute **GitHub Actions → Instalar versão do Stellar Legacy → Run workflow**.
4. Confirme `20.2.8` no jogo e no `/health` do Render.
5. No Android use **CONF → JOGO → DIAGNÓSTICO**, qualidade BAIXA e mesmo mapa para comparação.

## Onde olhar no relatório
- `Interface HUD JS p95` — soma do tempo gasto no HUD por quadro.
- `HUD completo p95` — **somente** os quadros que atualizaram o HUD completo.
- `HUD crítico p95` — **somente** quadros com HP, escudo e cooldowns rápidos.
- `HUD munições p95` — custo da rotina de estoque e seleção de munição.
- `FPS observados`, `Espera entre quadros p95` e `Quadros longos` — ajudam a distinguir JS de outras limitações do navegador.

O modo BAIXO continua limitado a 30 FPS; não houve alteração no timestep, regras de dano ou no esquema de contas.

---

> **V20.2.7:** perfil granular do loop e cadências auxiliares. Consulte `V20_2_7_RELATORIO.md` para mudanças e testes.

# STELLAR LEGACY V20.2.6 — NPCs / Diagnóstico de Gargalos (Android)

Release completa, incremental sobre a **V20.2.5**. **Não exige SQL novo.**

## O que mudou

- No gráfico **BAIXO**, NPCs comuns usam um caminho de renderização simplificado, mantendo os sprites originais (mesma resolução). Os efeitos de pulsação, banco e sombra dos NPCs comuns não são calculados nesse modo.
- A distâncias superiores a 280 unidades, os NPCs comuns deixam de desenhar a etiqueta com o nome; acima de 500 unidades, também deixam de desenhar barras de vida/escudo. **NPC selecionado, chefes e NPCs de evento sempre mantêm barras e nome, independentemente da distância.** Alvos, combate, movimento, HP, escudo, drops e respawn não foram alterados.
- O painel **CONF → JOGO → DIAGNÓSTICO DE DESEMPENHO** mostra agora tempo P95 de **SIMULAÇÃO JS** e **CANVAS**, separados, além do FPS e do tempo total do quadro.
- Botão **Copiar relatório técnico** inclui os dois valores. A medição permanece desativada por padrão; não faz envio automático.
- Testes de regressão: **164/164 aprovados**. Release `20.2.6` coerente no HTML, imports, servidor e pacote.

## Teste e instalação

1. Conclua o teste da V20.2.5 e anote o FPS no **mesmo mapa/cenário**.
2. Coloque **somente este ZIP**, sem extrair, na raiz do GitHub; remova os outros `stellar-legacy*.zip` da raiz.
3. GitHub Actions → **Instalar versão do Stellar Legacy** → **Run workflow**; confira o deploy Render e `/health` exibindo `20.2.6`.
4. Faça um teste no **gráfico BAIXO**, preferencialmente durante combate com vários NPCs. Abra **CONF → JOGO**, ative diagnóstico e deixe rodar pelo menos 30–60 segundos.
5. Copie o relatório e envie aqui, em especial **FPS observados**, **Tempo atualização JS p95**, **Tempo desenho Canvas p95**, **Tempo update + desenho p95** e **Intervalo entre quadros p95**. Se o tempo total de trabalho for baixo, mas FPS continuar em 14, investigaremos o limite de hardware/browser/composição e tarefas assíncronas.

**Importante:** Os testes garantem consistência local do código; não simulam o FPS de um Android real. Não há promessa de ganho de FPS nesta versão. Nenhuma alteração remota ao banco, Render ou GitHub foi feita para gerar este ZIP.

Veja `V20_2_6_RELATORIO.md` para detalhes técnicos.

---

# STELLAR LEGACY V20.2.5 — MOTOR CANVAS / MODO BAIXA

Atualização completa baseada na **V20.2.4 HUD MOBILE**, conservando todos os mapas, sistemas, sprites e testes anteriores. **Não precisa executar nenhum SQL.**

### Novidades desta release

- **Fundo mais leve em qualidade BAIXA:** as imagens de cenário 1600×900 são reduzidas uma única vez para 1024×576 num Canvas em memória e reutilizadas a cada quadro. Imagens originais de naves, NPCs, drones e AUX-9 **não são redimensionadas**. Em MÉDIA e ALTA, fundo original continua igual. O cenário em BAIXA pode ficar ligeiramente menos nítido.
- **Memória controlada:** o cache mantém no máximo dois fundos de mapas e volta à imagem original se a criação do Canvas falhar.
- **Minimapa recolhido/oculto:** deixa de gastar desenho no Canvas enquanto não está visível. Quando aberto, continua com sua taxa normal de atualização.
- **Nome dos pilotos:** larguras de nomes repetidos são medidas uma vez e reutilizadas num cache LRU de até 128 entradas; mudanças de nome/fontes são tratadas.
- **Limites do mapa e bases:** evita desenhar borda e estação orbital quando estão completamente fora da tela, com margem para preservar a zona segura.
- **Resize inteligente:** evita limpar o Canvas e invalidar gradientes se largura, altura e DPR não mudaram.
- **Testes:** `npm run verify` executa testes de regressão, verifica imports/versionamento e sprites em build.

### Instalação pelo GitHub Actions

1. Valide a V20.2.4 que já está em teste. Coloque **apenas este ZIP completo** na raiz do GitHub, sem extrair; remova outros arquivos `stellar-legacy*.zip` da raiz.
2. Vá em **Actions → Instalar versão do Stellar Legacy → Run workflow**.
3. Confira o deploy no Render e o endpoint `/health` exibindo `20.2.5`.
4. No Android, compare FPS na qualidade BAIXA e no mesmo mapa antes/depois, com mesmo número de NPCs. Confira mapa, troca de setor, minimapa aberto/fechado, NPCs, AUX, PvP, troca CONF 1/2 e escudos.

Os ganhos de FPS **não são garantidos**, pois dependem da carga de CPU/GPU do aparelho, das condições do navegador e da quantidade de objetos em jogo. Não houve deploy remoto nem alteração de conta/save feita neste pacote.

Leia `V20_2_5_RELATORIO.md` para ver as mudanças e validações.

---

# STELLAR LEGACY V20.2.4 — HUD MOBILE MAIS LEVE

**Atualização incremental completa sobre a V20.2.3.** Não há SQL adicional nem alterações em dados do Supabase.

- `public/modules/hud-update-scheduler.js`: separa atualização de valores críticos da batalha, contadores de munição e atualização completa do HUD.
- O perfil BAIXA mostra informações críticas aproximadamente a cada 140 ms, munições a cada 380 ms e atualização geral a cada 850 ms. Em MÉDIA/ALTA: aproximadamente 100 ms / 300 ms / 550 ms. Atualizações após ações explícitas continuam imediatas.
- `public/game.js`: reposicionamento do HUD agrupa as leituras de tamanho antes de escrever variáveis CSS, não reaplica variáveis sem mudança e evita pedidos duplicados de layout no mesmo quadro.
- O painel CONF → JOGO continua com diagnóstico voluntário de FPS, P95 e tempo do desenho.
- `tests/hud-scheduler-v2024.test.mjs`: casos de regressão para os limites e atualização imediata. Testes anteriores preservados.

### Instalação

1. Primeiro valide a V20.2.3. Envie apenas este ZIP completo para a raiz do GitHub (sem extrair e sem deixar outros ZIPs de instalação na raiz).
2. Actions → Instalar versão do Stellar Legacy → Run workflow.
3. Confira `/health` com versão `20.2.4` e o build com `npm run verify`.
4. No Android, teste HP/escudo, cooldown de 5 s da CONF 1/2, barra de munições, abrir/fechar chat/minimapa e mudança de orientação.
5. Meça o FPS da V20.2.3 e da V20.2.4 no mesmo dispositivo, mapa e perfil BAIXA. O ganho de FPS ainda depende dos testes no aparelho.

Leia `V20_2_4_RELATORIO.md` para os detalhes de segurança e validação.

---

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
