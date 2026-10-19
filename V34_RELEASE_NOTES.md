# STELLAR LEGACY V34.0.0 — GALACTIC EXPANSION

**Pacote único consolidado para instalar e testar**, derivado da V33.0.0. Sem migração SQL; não foi realizado deploy no Render/GitHub.

## Alterações implementadas
1. **NPC Intelligence 3.0 (servidor):** NPCs comuns sem combate patrulham ao redor do local de origem e retornam gradualmente se se afastarem; bosses, NPCs de eventos e NPCs sob agressão seguem com lógica original. Movimento continua autoritativo no servidor. Novo módulo puro `server/npc-intelligence-v34.js`.
2. **Galactic Combat Pro:** alerta tático de NPC agressor recente no Target Lock e indicador contextual das três fases dos bosses, com alerta de proximidade no Overdrive. Sem mudanças em dano, munição ou combate automático.
3. **Universe Events 2.0:** teto defensivo de NPCs/minérios temporários por sala e por tick para impedir que configuração muito alta inunde uma sala. Agenda e recompensas permanecem iguais. Configurações extraordinárias que pediam centenas de entidades simultâneas são limitadas.
4. **Multiplayer Evolution:** menor trabalho por tick na seleção da conexão destinatária do ataque NPC; perseguição e movimento de NPCs comuns no servidor, enviados aos jogadores pelo sincronismo existente. Não substitui auditoria ou teste PvP real.
5. **Performance Ultra:** qualidade média no celular horizontal evita filtros caros a cada quadro do fundo, preservando imagem do cenário e gradientes existentes; teto de renderização dos efeitos visuais (sem reduzir simulação/dano); melhorias de mensagens de combate.
6. **Visual Revolution (incremental):** sinalização angular das fases de boss e aviso visual no painel na fase final; sprites das 43 naves, NPCs, AUX-9 e fundos anteriores preservados. Não foram criados novos modelos 3D ou sprites autorais nesta etapa.
7. **Mobile:** modo landscape, hangar, chat, minimapa e barra de munições preservados. Indicador do boss ajustado para não cobrir o jogo em celular horizontal.
8. **Integração:** tests automatizados, versão unificada, verificação de assets/rotas/HTML/PWA, ZIP completo compatível com instalador universal.

## O que depende de validação no jogo
- Dois jogadores simultâneos (movimento, dano PvP, grupo, reconexão), eventos reais e economia/banco online.
- FPS em celular real: monitorar estabilidade e comparar mesmo mapa e número de NPCs.
- A atualização foi projetada para baixo risco, mas **não substitui testes reais**. Não faça deploy diretamente sobre jogadores ativos sem backup.
- Melhorias profundas de navegação de bosses, sistemas de guerra e novos sprites não são consideradas concluídas.

## Instalação
Usar um ZIP por vez no instalador universal já existente. Arquivos protegidos `.github` e `scripts/stellar-universal-installer.py` **não são sobrescritos** pelo pacote.

## Observação sobre QA visual
Um teste visual automatizado foi tentado no Chromium, mas a navegação para o servidor local retornou `ERR_BLOCKED_BY_ADMINISTRATOR`. Portanto **não foi possível confirmar o layout da V34 em um navegador**, embora as rotinas de sintaxe, contrato e arquivos tenham passado. Não confundir com erro de login do Stellar Legacy: foi uma restrição do ambiente de testes.
