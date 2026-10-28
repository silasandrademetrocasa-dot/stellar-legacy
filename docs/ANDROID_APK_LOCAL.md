# Stellar Legacy — APK local e economia de banda do Render

## Modelo implementado

O invólucro nativo Android abre `https://darkorbit-legacy.onrender.com/index.html`, mas **intercepta todas as requisições estáticas do domínio** via `WebViewAssetLoader` e carrega `index.html`, JavaScript, CSS, JSON, ícones, sprites, backgrounds, frames e texturas direto dos assets embutidos no APK. **Não é um WebView carregando o site remoto.**

A aplicação **mantém a mesma origem HTTPS do servidor**, portanto:
- `/api/...`: fetch/POST do navegador chega normalmente ao Render, sem CORS ou proxy local que prejudique autenticação e operações monetárias;
- `wss://.../ws`: WebSocket real para multiplayer, posição, NPCs, eventos, chat e combate;
- Supabase HTTPS: login/Auth quando o jogo chama seus endpoints de identidade autorizados;
- recursos estáticos: **0 bytes de transferência do Render** na navegação normal do APK, desde que eles existam no bundle;
- não há backend Node, SQL, `node_modules`, `.env`, tokens privilegiados ou dados secretos dentro do APK.

**Distinção:** economia de banda de *assets* não equivale a rede totalmente zero. Jogar multiplayer exige pacotes de estado e chamadas de API; Render ainda os envia/recebe e integra Supabase. O APK não armazena NPCs/economia de forma autoritativa.

## Construir

O workflow atual `Instalapk.yml` passa a funcionar depois que `android/` e `scripts/prepare-apk-assets.js`, `scripts/verify-apk.js` forem instalados. Configure a variável de Actions `STELLAR_SERVER_URL=https://darkorbit-legacy.onrender.com`.

Action: **Stellar Legacy — APK Local** → Run workflow → baixar artifact `...APK-Local-Teste` → instalar no Android.

Para release: enviar os secrets de assinatura **STELLAR_KEYSTORE_BASE64**, **STELLAR_KEYSTORE_PASSWORD**, **STELLAR_KEY_ALIAS** e **STELLAR_KEY_PASSWORD**, e selecionar `build_release=true`.

**Nunca envie as chaves de assinatura para o ChatGPT, APK, ZIP do instalador ou código.** Configure somente nos Secrets privados do GitHub.

## Limites e critérios de teste

- É obrigatório ter internet para autenticar, salvar, combate multiplayer, leilão, economias oficiais e regras de ADM. Não houve adaptação para jogar offline de verdade.
- Google OAuth **no WebView pode ser recusado pelo Google**; login e senha funcionam no fluxo oficial. Para Google OAuth no APK é necessário implementar Android Custom Tabs + App Links de retorno e configuração do provedor; esta versão não promete esse login.
- Web Push/Service Worker pode não funcionar como no Chrome; Farm Offline usa servidor, mas os avisos por Push dependem do suporte do Android WebView.
- Usar o hostname correto é imprescindível. A build não funciona contra subcaminhos `/game` do servidor ou URL sem HTTPS.
- Como não usamos `file://`, `allowFileAccess` e `allowContentAccess` são desativados.
- Em DevTools/ADB, verificar que `/assets/...`, `/modules/...`, `/game.js`, `/style.css`, `/index.html` **não aparecem como downloads de rede**; somente `/api/...`, `/ws` e HTTPS do Supabase.
- Para validar economia de banda, comparar em log do Render bytes requisitados por usuário Web vs Android APK após abertura e 5 minutos jogando. Não declarar redução percentual sem medir.
- O APK incluirá recursos Web completos (~75 MiB de fonte), portanto seu tamanho pode ser elevado. Não baixar dados de forma invisível para tentar esconder tamanho.
- Toda alteração em `public/` requer **nova compilação do APK**. O navegador Web continuará atualizando de forma independente no Render. Builds antigas podem sofrer incompatibilidade de protocolo ao atualizar o servidor; planejar versões compatíveis.
- Ao instalar com conta de testes, validar login, mapas X-1/X-7, Portal Astral, Farm Offline, Leilão, missão, nave, drone e AUX, comportamento ao alternar rede Wi-Fi/4G e indicador de FPS.

## Diagnóstico de build

- `npm run verify` valida a versão Web.
- `node scripts/prepare-apk-assets.js` cria inventário SHA-256 do bundle.
- `node scripts/verify-apk.js` confirma os arquivos, o sourceSet, as rotas e os controles de transporte HTTPS.
- `gradle --no-daemon -p android :app:assembleDebug` compila o APK com JDK 17, Gradle 8.13, AGP 8.12.2 e SDK 36. A execução real da compilação depende do GitHub Actions com Android SDK.

## Organização segura do Git

Antigos documentos de release foram movidos para `docs/archive/` e registros de balanceamento antigos para `docs/balance/v81/`. Sprites e mapas mantêm os mesmos nomes e caminhos: remover arquivos por heurística poderia quebrar partes do jogo que carregam por nome dinâmico. A limpeza agressiva de assets deve ser outra etapa, apoiada em métricas de acesso reais.

## Workflow .github protegido

O **Instalador Universal protege `.github/`** por projeto. O pacote de atualização de código não altera o workflow existente. O workflow atual V64 compilará o APK com os scripts e `android/` instalados, mas ainda rotulará o artifact com V64; use o workflow atualizado entregue como arquivo separado para substituir `.github/workflows/Instalapk.yml` manualmente quando possível.
