# Stellar Legacy Mobile/Web — V146.4 / 47.8.4

Correção cumulativa da aparência web. Não há SQL novo, alteração de economia, mudança de balanceamento, exclusão de dados ou deploy nesta entrega.

## Diagnóstico e alcance

O print mostra perda generalizada de gradientes/cores, contornos brancos e fundos atrás dos textos. Isso é compatível com a adaptação de cores forçadas do navegador/sistema. É uma inferência a partir da imagem, não uma confirmação das configurações do PC do usuário.

A mesma URL pública `https://darkorbit-legacy.onrender.com/` foi aberta em Chrome de controle, sem autenticação. A versão publicada identificada era 47.8.3. O navegador de controle informou `forced-colors: false`, `prefers-contrast: more: false`, e mostrou a tela de login com gradientes azuis e bordas coloridas originais. Os stylesheets principais foram encontrados. Portanto, não se comprovou uma ausência geral de CSS na versão publicada. Não se entrou em conta real nem se comparou o combate nessa mesma posição do mapa.

Em cores forçadas, o navegador pode substituir cores/bordas, remover fundos em gradiente e desenhar fundos atrás de texto. A referência técnica primária é a documentação CSS e a especificação:

- https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/forced-colors
- https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/forced-color-adjust
- https://www.w3.org/TR/css-color-adjust-1/

## Correção aplicada

A aparência padrão passa a preservar a paleta já existente do Stellar Legacy, inclusive sob a adaptação nativa de cores forçadas. Não se criou outro tema ou outro conjunto de artes. A proteção usa `forced-color-adjust: none` e `color-scheme: only dark` quando o modo original está selecionado.

Em **MAIS → Configurações → JOGO → APARÊNCIA DA INTERFACE**, há duas opções:

- **VISUAL ORIGINAL DO JOGO:** preserva as cores, os gradientes e a identidade existentes.
- **CORES DO SISTEMA:** restaura a adaptação do navegador/sistema, inclusive preferências de contraste. A acessibilidade continua disponível por escolha explícita.

O modo é aplicado no início do HTML, antes da folha principal, evitando que dependa de login ou de resposta do servidor. A preferência é local, usa uma única chave própria de aparência e não entra no save econômico. Não consulta Supabase/Render, não usa polling, não modifica sessões e não limpa armazenamento. Se o navegador bloquear essa preferência, o controle ainda funciona naquela página e não interrompe o jogo.

Foram preservados os layouts D1–D8, formações locais, HUD de 18 slots, CONF1/CONF2, compras, coletas, missões, HP/escudo, imagens e as demais correções cumulativas. As posições personalizadas do HUD e o diagnóstico de FPS continuam sob os controles existentes; não se apagaram preferências para tentar corrigir cores.

A textura/câmera do mapa não foi alterada nesta correção. O fundo do mundo é Canvas e as áreas escuras dependem do mapa/posição/qualidade. Sem reproduzir a mesma conta/câmera, não seria correto declarar uma falha separada da arte. O teclado virtual e a barra de tarefas do print pertencem ao Windows, não ao HTML do jogo.

## Aplicação na web

1. Faça backup do projeto atual.
2. Aplique `Stellar_Legacy_V146_4_CUMULATIVA.zip` pelo Instalador Universal existente. É uma atualização cumulativa desde a base V144.1/47.7.80, para aplicar sobre o projeto existente; não inclui novamente as artes inalteradas.
3. Faça o deploy habitual no Render. Nenhum deploy foi executado nesta entrega.
4. Abra a web e use **Ctrl+F5** para carregar o HTML/CSS atualizados. Não precisa apagar dados, cookies, saves ou a fila.
5. Confira a versão 47.8.4 e o modo VISUAL ORIGINAL DO JOGO. A versão web não depende de gerar um novo APK.

**Não execute SQL para esta correção.** Os scripts antigos do histórico cumulativo não são uma instrução de reaplicação. Para rollback, restaure o código V146.3 pelo backup e publique novamente; a preferência de aparência será apenas ignorada pela versão antiga. Não remova dados de jogador nem reverta o SQL V146.

## Testes e limitações

`npm run verify`: **323 testes, 322 aprovados, zero falhas e um ignorado por ausência do JDK**. Inclui sintaxe/imports/versões e a regressão cumulativa anterior. Os quatro testes novos verificam aplicação antes do CSS, escolha/persistência/reabertura do modo do sistema, preferência inválida ou armazenamento bloqueado e integração dos controles/CSS reais. Eles não substituem um teste de pixels em Windows.

`npm run apk:check` passou na auditoria estrutural: 1.364 arquivos locais, 1.103 imagens, 43 naves e 40 NPCs. Não foi compilado nem executado um APK.

Foi incluído `npm run test:web:appearance`, teste opcional com Playwright/Chromium. Ele emula `forcedColors: active`, confere gradientes do HUD/HP nos dois modos e persistência após recarregar. **Não passou a ser um teste executado com sucesso neste ambiente:** a inicialização do Chromium foi bloqueada pela restrição de sockets do processo (`process_singleton_posix`, `socket() ... Operation not permitted`). O log dessa tentativa está nesta pasta. A abertura de uma prévia local no navegador conectado também não foi permitida pela política de URLs. Não houve contorno dessas restrições.

Falta executar o teste de cores forçadas num navegador que permita a emulação e confirmar no Windows do usuário depois do deploy. O que foi inspecionado no navegador de controle foi a versão publicada anterior, não a V146.4 já implantada. Extensões que injetem regras CSS próprias ou filtros externos ainda podem alterar a aparência; não se acessaram nem desativaram extensões ou ajustes do sistema.

A migração local-first geral conserva as pendências da V146.2/V146.3. Esta versão corrige a proteção de aparência e não declara toda a economia ou todo o combate como offline.
