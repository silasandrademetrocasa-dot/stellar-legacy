# STELLAR LEGACY — V21.3.0 • PACOTÃO DE EVOLUÇÃO

**Base:** V20.3.3 — ADM unificado. **Entrega:** um ZIP completo para instalar pelo GitHub Actions.

## Etapas incluídas

### V21.0 • Fundação modular e proteção do release
- Módulos ES independentes em `public/modules/v21/`: `operations`, `war-briefing`, `season-briefing`, `command-center-view` e `pwa`.
- Componentes de análise isolados, testáveis sem navegador e sem acesso ao save. O arquivo legado `game.js` continua existente: extração total do motor deve ser gradual e será uma migração maior, não foi realizada aqui.
- Cabeçalhos HTTP `X-Content-Type-Options` e `Referrer-Policy`; rotas, autenticação e esquema SQL existentes preservados.
- Testes automáticos e checagem de release no build do Render.

### V21.1 • Endgame — Operações de Elite
- Treze objetivos permanentes, com faixas de evolução avançadas derivados de progresso existente: nível, NPCs, missões, saltos, portais e boxes.
- Barra de progresso e estado cosmético; nenhuma recompensa CR, STL, XP ou inventário é concedida pelo novo painel.

### V21.2 • Visão tática das guerras
- Painel de facção, clã, world boss, placar de relés e setores, lendo o Shared Universe e o Warfront existentes.
- Atalhos para Warfront, Clã e Eventos; **não cria uma nova modalidade PvP ou novas batalhas**. As regras autoritativas continuam no backend existente.

### V21.3 • Temporadas e prestígio
- Resumo do Passe de Batalha atual: tier, pontos e conquistas; título cosmético calculado da progressão.
- Atalhos para Passe e Perfil; recompensas/tier/temporadas são gerenciados pelo fluxo já existente, sem alteração dos prêmios no banco.

### V21 Mobile • Instalação como app (PWA)
- `manifest.webmanifest`, ícones 192 e 512 px baseados no logo existente, página offline informativa e `sw.js` restrito.
- O service worker NÃO faz cache de credenciais, API, saves ou WebSockets; apenas página offline e ícones. **O jogo continua exigindo internet**. Instalação depende do suporte do navegador.

## Como acessar
- **MISSÕES → ✦ CENTRO DE COMANDO V21** → abas Elite / Guerra / Temporada.
- Botão **INSTALAR NO CELULAR** usa o prompt quando o navegador o disponibiliza; senão, acesse o menu do navegador e escolha instalar/adicionar à tela inicial.

## Segurança e testes
- Sem migrations SQL novas; sem alterar combate, recompensa, saldo, saves, CONF1/2 ou transações.
- Testes locais não são validação em Render ou em todos os celulares; validar em conta de teste e console do navegador antes de produção.
- Pontos maiores que exigem desenvolvimento separado: motor `game.js` ainda monolítico, **novos eventos PvP com recompensas servidoras**, missões elite com prêmios autoritativos e temporadas ranqueadas com histórico de servidor.
