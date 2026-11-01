# STELLAR LEGACY V112.0 — AUTOPILOT INTELIGENTE

Atualização incremental para a V111.1, sem SQL e sem alterar Farm Offline, NPC Rewards ou server/world.js.
Instale pelo Instalador Universal: enviar somente este ZIP para a raiz do GitHub, executar workflow "instalar".

## Implementado
- Coleta de BOX BÔNUS enquanto caça NPCs e coleta de Loot de NPC durante os ataques; prioriza recompensas temporárias, sem perseguir caixas distantes do alvo durante combate.
- Ao não haver inimigos, busca BOX BÔNUS no mapa mesmo longe; quando há Loot perto, coleta-o antes de uma viagem distante.
- Órbita evasiva em movimento durante ataque com desvio de aglomerações e limites do mapa; mantém alvo e tiro enquanto reposiciona.
- Comprar munição e mísseis com a compra oficial em segundo plano sem bloquear movimento/combate quando o CPU de Auto Buy está equipado; sem CPU, aguarda na base até confirmar compra.
- Venda remota em segundo plano com Terminal Mercante Remoto Elite, sem congelar a perseguição ao NPC.
- Compra e venda jamais são repetidas automaticamente após resposta incerta; bloqueio local evita duplicidade. Saldo e itens continuam validados pelo servidor.
- Mínimos iniciais proativos: 2.500 munições, 100 mísseis, limite inicial de 25 milhões de créditos para compras (ajustável até 250 milhões no painel, opcional).
- Novos toggles: órbita, coleta em combate, evasão de aglomerações; preserva opt-in do piloto e limites de PvP/astral.

## Limitações intencionais
- Ações remotas exigem os CPUs correspondentes **equipados**, não apenas no inventário. O bot não compra/vende à distância sem os CPUs.
- O Autopilot funciona com a sessão online aberta; não é o sistema de Farm Offline.
- Ritmo das ações depende da conexão e das confirmações do servidor. Não concede recompensas diretamente.
- Alterações de rota/mapa usam o grafo de portais existente. Se o jogador estiver em um PvP/mapa proibido, o bot não age.

## Validar depois do deploy
1. Em X-3 com NPCs próximos, ativar órbita: a nave deve circular e atirar sem permanecer estacionária.
2. Com BOX BÔNUS e Loot próximos, observar coleta dos dois sem abandonar NPC válido e sem atravessar por inimigos distantes.
3. Baixar munição/mísseis abaixo dos mínimos, equipar CPU de compra e confirmar compra sem paralisar a nave.
4. Equipar Terminal Mercante Remoto Elite, encher porão >85% e confirmar venda sem parar o combate.
5. Sem CPUs, verificar que não faz transações remotas, mas consegue retornar à base e comprar após confirmação.
6. Testar HP crítico, mapa trocado, rota de retorno, desconexão curta e desligamento manual; nada de créditos ou itens inventados.
7. Confirmar que o Farm Offline da V111.1 permanece inalterado.

Testes automatizados não substituem homologação com NPCs, mapas e economia reais.
