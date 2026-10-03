# Changelog — Stellar Legacy

## V13.0.0 — Combat Ascension

- Novo framework de habilidades ativas de nave com classes Suporte, Tanque, Controle, Dano Contínuo e Assalto.
- HUD de habilidade com cooldown visual; atalho `E`.
- Kamikaze do P.E.T. movido para botão ativo dedicado; atalho `K`; continua respeitando uma explosão por ativação e cooldown de 15s.
- BOSS agora possuem três fases dinâmicas com escalada de velocidade, dano e cadência em 66% e 33% de vida+escudo.
- HUD de BOSS mostra fase e percentual restante.
- Galaxy Gate expandido para ALFA/BETA/GAMMA com progressão de desbloqueio, peças, rounds, escalas de inimigos e multiplicadores de recompensa próprios.
- BETA: 48 peças, 9 rounds, 130% de escala e recompensa total 4X.
- GAMMA: 64 peças, 10 rounds, 165% de escala e recompensa total 5X.
- Novos mapas privados `ggBeta` e `ggGamma`.
- Cooldown da habilidade da nave persiste no save para impedir refresh exploit.
- Compatibilidade automática com saves antigos; nenhuma migration de banco adicional necessária.

## V13.0.0 — P.E.T. Kamikaze One-Shot + Audit

- Corrigido Kamikaze infinito/reentrante do P.E.T.
- Cada seleção do módulo arma exatamente 1 detonação; a carga é consumida antes do dano para bloquear repetição no mesmo ciclo.
- Depois da explosão o P.E.T. volta automaticamente para Companhia e respeita recarga global de 15s.
- Qualquer troca de módulo cancela a carga de Kamikaze imediatamente; BOX/Pedras/Guardião/Reparo nunca herdam detonação pendente.
- Reload e troca de mapa desarmam Kamikaze ativo de saves antigos.
- Corrigido desalinhamento de versão/cache entre HTML, módulos JS, `package.json` e servidor.
- Pente-fino estático: sintaxe JS, IDs HTML, imports/exports de API, assets locais e referências de versão verificados.

## V12.1.4 — Login Único / Segurança de Sessão

- Uma conta só pode manter uma sessão oficial do jogo por vez.
- Novo login substitui a sessão anterior imediatamente no banco.
- Cliente conectado verifica a sessão a cada 3 segundos e também ao voltar para a aba.
- Sessão antiga é encerrada com aviso “Sua conta foi acessada em outro dispositivo”.
- Endpoints de save/autenticação validam o identificador da sessão ativa no servidor.
- Refresh token da sessão antiga não consegue reativar o jogo após substituição.
- Ao ser expulso, o save local daquela sessão é descartado para não sobrescrever o progresso do dispositivo novo.
- Logout normal limpa o registro da sessão ativa.
- Sessões antigas anteriores à V12.1.4 exigem novo login uma única vez.

## V12.1.3 — P.E.T. Guardião + Venda Segura

- Corrigido alcance do Modo Guardião: busca automática limitada ao mesmo alcance de laser da nave.
- Coleta de BOX/Pedras reduzida para 50% do raio do minimapa.
- O P.E.T. mantém o alvo de coleta mais próximo dele dentro desse raio reduzido.
- Novo modal de confirmação de venda para inventário, equipamentos equipados, equipamentos do P.E.T. e drones.
- Cancelar não altera inventário nem saldo.

# Changelog — Stellar Legacy

O projeto usa um único changelog consolidado. Os arquivos `CHANGELOG_Vx_y.md` antigos foram removidos do pacote; o histórico completo continua disponível no Git.

## Baseline V10.10.1
Conta online, save cloud, facções, mapas, NPCs, Hangar, equipamentos, P.E.T., missões, Galaxy Gate, ranking, leilão, PvP e Arena foram consolidados como base do jogo.

## V11
- Arena cinematográfica calculada no servidor.
- Sistema de patentes e ranking.
- Administradores ficam fora dos rankings públicos.
- Clãs/alianças e TAG no nome dos pilotos.
- Recompensas de nível e Passe de Batalha.

## V12
- Loja Premium em modo de teste ADM.
- Passe FREE + PREMIUM e Solace no Tier 30 Premium.
- PREMIUM mensal com benefícios de reparo, regeneração, míssil e descontos.
- Equipamentos só podem ser alterados na base.
- Microzona neutra de NPC ao redor dos portais.
- Clã LV1–10, rendimento diário, coleta automática de 10% e taxa de 5% em transferências.

## V12.1 — P.E.T. Autônomo
- Alcance de coleta passa a acompanhar o radar do minimapa.
- Assistência prioritária ao alvo atacado pelo jogador.
- Patrulha e escolta independente.
- Combate automático quando não há tarefa de coleta.

## V12.1.1 — P.E.T. Inteligente + Cleanup
- Velocidade do P.E.T. reduzida em patrulha, coleta, escolta e combate.
- Aproximação desacelera perto do objetivo para eliminar o efeito de vai-e-volta.
- BOX e pedras são escolhidas pela distância ao próprio P.E.T., desde que estejam dentro do radar do jogador.
- O alvo de coleta fica travado até ser coletado, expirar ou sair do radar; o P.E.T. não troca de objetivo a cada frame.
- Patrulha usa trajetos menores e troca de waypoint com menos frequência.
- Alvos automáticos de combate também ficam estáveis enquanto forem válidos.
- Changelogs por versão, SQL histórico, documentação obsoleta e página de catálogo de assets não usada foram removidos do release.
- Backend de referência consolidado em `sql/CURRENT_BACKEND.sql`.


## V12.1.2 — Location Persistence Hotfix
- Corrigido bug que misturava `mapId` novo com `x/y` do mapa anterior durante salto por portal.
- Novo `positionByMap` preserva coordenadas por mapa/facção.
- `saveGame()` agora sincroniza `player.x/y` antes de serializar.
- Transições de mapa fazem flush cloud imediato.
- Reload prefere save local mais recente quando o cloud ainda está alguns instantes atrasado.


## V12.1.5 — HUD Mobile Clean
- Removidos do topo, no mobile, os chips de versão/piloto/patente/nível/créditos/uridium para liberar espaço aos botões MAPA e GG.
- Mantidos os botões principais do topo e o HUD limpo em celular.
- Desktop continua exibindo as informações normalmente.


## V12.1.6 — Confirmações de compra/gasto

- O modal de confirmação agora também cobre compras e gastos de créditos/uridium.
- Loja: comprar naves, equipamentos, munições, rockets, P.E.T. e módulos do P.E.T. exige confirmação.
- Gastos manuais: slots do P.E.T., giros do Galaxy Gate, compra de Log-Disks, upgrade da Árvore de Piloto e reset também exigem confirmação.
- Auto-buy permanece sem confirmação por ser automático e controlado por CPU.
