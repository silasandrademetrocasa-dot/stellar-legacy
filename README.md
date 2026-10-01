# Stellar Legacy V9.8 — Dynamic Mission Flow

Grande atualização de conteúdo sobre a base V9 Expedition. Mantém os mapas expandidos e adiciona densidade maior de NPCs e um sistema persistente de missões com aceite manual.

## Destaques V9.3

- Mais inimigos para preencher os mapas gigantes da V9.
- X-1: ~48 NPCs; X-2: ~70; X-3: ~65; X-4: ~60; mapas 4-X: ~64–67 NPCs.
- Novo botão **MISSÕES** na barra superior.
- Categorias: **Diária, Semanal, Mensal e Especial**.
- O objetivo só começa a contar depois de clicar em **ACEITAR**.
- Apenas **1 missão ativa por categoria**; até 4 simultâneas no total (uma de cada categoria).
- Missões aceitas e progresso ficam dentro do save local/cloud.
- Missões diárias, semanais e mensais usam ciclos próprios; especiais são permanentes.
- Progresso integrado a eliminações, bosses, mapas 4-X, coleta de minério e exploração.
- Recompensas em Créditos, Uridium e XP.
- Missões completas exigem **RESGATAR** para liberar a vaga da categoria.
- Missão pode ser abandonada; o progresso daquela tentativa é perdido.
- Correção interna dos seletores do painel recolhível da nave.

---

Grande atualização baseada na V8.3 Identity Build, mantendo Node.js + Express + Supabase e evoluindo o jogo para mapas muito maiores, exploração real e combate mais vivo.

## Destaques da V9

- todos os mapas foram ampliados de forma agressiva
- mapas baixos agora vão de **6.000×4.500** até **7.800×5.600**
- Battle Maps chegam a **11.200×8.000**
- posições de portais foram refeitas para as novas dimensões
- saves antigos são migrados proporcionalmente para o novo tamanho de mapa
- quantidade de NPCs e minérios aumentada para preservar densidade sem lotar o celular
- NPCs passam a surgir em torno de pontos de interesse, formando zonas de caça
- landmarks de exploração foram adicionados: beacons, destroços, anomalias e pontos de varredura
- grid de setor no canvas para dar escala e sensação de deslocamento
- coordenadas da nave e distância até o destino agora aparecem na HUD
- clique no minimapa traça uma rota visual até o destino
- seta de navegação aparece na tela quando o waypoint está fora do campo de visão
- minimapa maior e com grade, landmarks, portais, radar e rota
- backgrounds usam recorte dinâmico baseado na posição da câmera, mudando conforme o jogador atravessa o mapa
- radar ampliado para os mapas maiores
- alcance de laser e míssil ajustado para a nova escala
- seleção de NPC melhorada para sprites maiores
- explosões, impactos, escudo e partículas novos
- mísseis agora possuem efeito visual de trajetória
- bosses recebem explosões maiores e aura visual mais forte
- culling de objetos fora da tela para reduzir custo de renderização no celular
- identidade visual, sprites, equipamentos, drones, P.E.T., recursos, loot e fundos da V8.3 continuam integrados

## Dimensões dos mapas

| Mapa interno | Tamanho V9 |
| --- | --- |
| X-1 | 6000 × 4500 |
| X-2 | 6600 × 4800 |
| X-3 | 7200 × 5200 |
| X-4 | 7800 × 5600 |
| 4-1 | 9800 × 7000 |
| 4-2 | 10400 × 7400 |
| 4-3 | 11200 × 8000 |

A numeração exibida continua respeitando a facção: Terra 1-X, Marte 2-X e Júpiter 3-X.

## Identidade visual

Os assets continuam organizados em:

```text
public/assets/v8/
  ammo/
  backgrounds/
  branding/
  drones/
  equipment/
  loot/
  npcs/
  resources/
  ships/
  manifest.js
```

O nome da pasta foi mantido para compatibilidade com a V8.3 e para evitar duplicar dezenas de imagens no deploy.

O catálogo visual continua disponível em:

`/asset-catalog.html`

## Stack

- Node.js 18+
- Express
- Supabase
- HTML/CSS/JavaScript Canvas 2D

Não foi necessário adicionar PHP ou C#. O gargalo atual é gameplay/renderização no navegador, e a stack atual é mais simples para Render + Supabase e permite deploy direto pelo Git.

## Render

Variáveis esperadas:

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`

## Validação

Antes de empacotar a release:

- `public/game.js` → `node --check`
- `public/data.js` → `node --check`
- `public/assets/v8/manifest.js` → `node --check`
- `server/index.js` → `node --check`

Release: **9.0.0**

## V9.4 — Progress Protocol
- Diárias: somente caçadas de NPC específico.
- Semanais: somente caçadas de NPC específico.
- Mensais: única categoria que permite eliminações gerais.
- Especiais: nova campanha permanente de progresso em 8 etapas.
- Cada etapa especial exige a conclusão da anterior.
- Continua valendo a regra de 1 missão ativa por categoria.
- O progresso só começa depois de ACEITAR.


## V9.5 — Reward Protocol
- A recompensa de missão agora é dinâmica.
- Cada eliminação válida adiciona ao prêmio da missão 50% dos Créditos, Uridium e XP que aquele NPC realmente concede.
- Missões de NPC específico usam exatamente os NPCs pedidos.
- A missão mensal de matança geral calcula o bônus com base nos inimigos realmente abatidos, então NPCs mais fortes aumentam o prêmio.
- O painel mostra o bônus acumulado em tempo real.
- Recompensas fixas antigas deixaram de ser usadas no resgate.


## V9.6 — Mission Arsenal
- Diárias: exatamente 3 contratos por dia, sorteados deterministicamente.
- 1 diária de NPC aleatório: 100 normal ou 50 BOSS.
- 1 diária de pedra aleatória: 500 unidades.
- 1 diária conjunta: 50 + 50 NPCs comuns diferentes + 10 BOSS.
- Semanais: 10 contratos para cada NPC e cada pedra com metas 10/25/50/100/150/200/250/500/750/1000.
- Mensais: mesma estrutura da semanal com metas 10x maiores.
- Especiais: 1 contrato de 10 eliminações para cada NPC, contratos de pedra, 5 mistos de NPC, 5 BOSS solo, 5 BOSS mistos e 6 híbridos NPC + pedra.
- Missões especiais pagam 100% da soma dos ganhos dos alvos; diárias/semanais/mensais continuam pagando 50%.
- Parte das missões compostas é sequencial: uma tarefa precisa ser concluída para desbloquear a próxima.
- Painel ganhou busca e filtro por NPC/BOSS/PEDRAS/MISTAS/NPC+PEDRA.


## V9.7 — Galaxy Gate Alpha

### Montagem
- 34 peças únicas para montar o portal ALFA.
- Cada sorteio do materializador custa 10 Uridium.
- Botões: 1x, 5x, 10x, 50x e 100x.
- Possíveis resultados: peça ALFA, LCB-10, MCB-25, MCB-50, UCB-100, R-310, PLT-2026, PLT-2021, PLT-3030, Xenomit, Créditos, Bônus de Salto e Bônus de Reparo.
- Bônus de Reparo já pode ser consumido na base para reparar HP e escudo completamente.

### Combate
- 8 rounds.
- 3 vidas por tentativa.
- Morrer no ALFA devolve o piloto à base X-1 e mantém mortos os NPCs já eliminados.
- O piloto precisa saltar novamente pelo painel Galaxy Gate para continuar.
- Ao perder as 3 vidas, o ALFA é perdido e precisa ser remontado.

### Ondas
1. 4x 10 Streuners
2. 4x 10 Lordakias
3. 4x 10 Saimons
4. 4x 10 Mordons
5. 10 Boss Streuners → 10 Boss Lordakias → 10 Boss Saimons → 10 Boss Mordons
6. 4x 5 Devolariums
7. 2x 5 Boss Devolariums
8. 10 Sibelons → 10 Sibelons → 10 Boss Sibelons → 5 Boss Sibelons

As ondas têm 10 segundos entre elas.

### Recompensa
- As eliminações dão os ganhos normais durante o portal.
- Ao completar o ALFA, o jogo concede +200% adicionais dos Créditos, Uridium e XP obtidos pelos NPCs do gate.
- Total final de recompensa direta dos NPCs: 3X.


## V9.8 — Dynamic Mission Flow
- Semanais e mensais exibem somente o próximo degrau por NPC/pedra.
- Missão concluída some da tela e a recompensa entra automaticamente.
- Animações de MISSÃO COMPLETA e LEVEL UP.
- Drones e P.E.T. mais afastados da nave.
- P.E.T. usa a mesma munição laser selecionada pela nave, 1 munição por laser/rajada, com Auto Buy compatível.


## V9.8.1 — Gate Timing Fix
- Dentro de cada Round, as ondas continuam aparecendo automaticamente a cada 10 segundos, mesmo que ainda existam NPCs da onda anterior.
- O próximo Round NUNCA começa enquanto houver qualquer NPC vivo do Round atual.
- Depois que a última onda do Round já apareceu e todos os NPCs daquele Round forem eliminados, inicia uma contagem de 10 segundos.
- Após esses 10 segundos, a primeira onda do próximo Round aparece.
- As ondas seguintes desse novo Round continuam entrando de 10 em 10 segundos.


## V9.8.2 — Gate UI Fix
- Modal do Galaxy Gate agora abre acima do HUD/topbar, sem ficar escondido atrás da logo.
- A janela do portal foi ancorada com espaçamento superior adequado e scroll próprio.
- Header do modal do portal ficou sticky para facilitar leitura e navegação.
- Ajustes mobile para o modal do portal não colidir com a interface.


## V9.8.3 — Alpha Combat Fix
- Cache busting adicionado em CSS, game.js, data.js, api.js e manifest para impedir mistura de versões antigas no navegador.
- Ao entrar no ALFA, a primeira onda inicia após uma contagem real de 10 segundos.
- Estado antigo/travado do Gate é autocorrigido caso esteja sem temporizador.
- Ondas seguintes continuam surgindo a cada 10 segundos mesmo com NPCs anteriores vivos.
- Próximo Round só entra depois de todas as ondas atuais terem aparecido e todos os NPCs do Round terem morrido.
- Depois de limpar o Round, são 10 segundos até iniciar o próximo.
- NPCs do Galaxy Gate surgem próximos à borda do alcance do radar/minimapa do jogador.
- NPCs do Galaxy Gate perseguem o jogador permanentemente, independentemente da distância.
- Dentro do ALFA, o botão Galaxy Gate não abre mais o materializador gigante sobre a batalha; a HUD compacta continua ativa.


## V9.9 — Extra Expansion

### CPUs de expansão de slots
- CPU Expansora Comum: equipada em um slot EXTRA e libera +3 novos slots EXTRAS.
- CPU Expansora Elite: equipada em um slot EXTRA e libera +6 novos slots EXTRAS.
- As duas versões não acumulam entre si.
- Ao remover uma CPU expansora, equipamentos que ficarem acima da capacidade da nave retornam automaticamente ao inventário.

### Robôs de reparação automática
- Repair Bot Auto Comum: após 5 segundos sem receber dano, recupera 1% do HP máximo por segundo.
- Repair Bot Auto Elite: após 5 segundos sem receber dano, recupera 2% do HP máximo por segundo.
- Funcionam fora da base e independem da distância dos inimigos: o relógio reinicia somente quando a nave recebe dano.
- Comum e Elite não acumulam entre si.
- A base X-1 mantém sua regeneração própria mais rápida.


## V9.10 — Cargo & UX

### Fechamento rápido de janelas
- ESC fecha a janela de jogo atualmente aberta.
- Clique/toque no fundo escuro fora do card também fecha a janela.
- Aplicado a: Mapas, Missões, Galaxy Gate, P.E.T., Loja, Hangar e Porão.
- Login e seleção obrigatória de facção permanecem protegidos contra fechamento acidental.

### Novos EXTRAS de Porão
- Módulo de Porão • Comum: +2.500 de capacidade.
  - Preço: 8.000.000 Créditos.
- Módulo de Porão • Elite: +10.000 de capacidade.
  - Preço: 120.000 Uridium.
- Comum e Elite não acumulam entre si.
- O bônus funciona somente enquanto o módulo estiver equipado.
- O Hangar e o painel do Porão mostram a capacidade total e o bônus equipado.

### Regra econômica
- Itens Comuns usam Créditos.
- Itens Elite usam Uridium.


# V10 — Pilot Ascension

## Economia Hardcore
Todos os preços da Loja foram rebalanceados para progressão longa. Itens comuns usam Créditos; itens Elite usam Uridium. Naves, lasers, geradores, extras, drones, munições e mísseis ficaram substancialmente mais caros.

## Perfil de Piloto
- Máximo de 50 Pontos de Pesquisa.
- Log-Disks custam 300 URI cada.
- Primeiro PP: 30 Log-Disks; cada PP seguinte cresce 10% e é arredondado.
- Log-Disks caem no Materializador e o ALFA completo concede 50.
- Três trilhas: Defesa, Utilidade e Ataque.
- 25 habilidades com pré-requisitos, níveis e custos em Créditos.
- Reset começa em 1.000 URI e dobra a cada reset.

## Leilão Elite
- Todos os produtos Elite da Loja participam: naves, equipamentos, drones, munições e mísseis.
- Lances em Créditos, a partir de 100.000 CR.
- Ciclo encerra e reinicia de hora em hora.
- Lance fica em garantia: perdeu, recebe os Créditos de volta; venceu, recebe o item.
- Concorrência automática aumenta durante a hora para manter o sistema competitivo.
- Equipamentos Elite do P.E.T. também entram no catálogo do Leilão.


## V10.1 — Combat Evolution
- Nave gira suavemente e mantém o nariz apontado para o alvo selecionado, inclusive enquanto se move.
- Navegação preserva clique simples e adiciona mouse segurado: enquanto o botão esquerdo fica pressionado, o destino acompanha o cursor.
- Níveis do piloto e do P.E.T. usam a progressão cumulativa clássica baseada em 10.000 XP no nível 2 e duplicação dos requisitos seguintes, com teto atual no nível 44.
- P.E.T. não é mais gratuito: unidade base custa 1.500.000 Uridium e começa sem ser possuída em contas novas.
- P.E.T. usa a mesma progressão de XP do jogador; slots de equipamento continuam limitados aos 15 primeiros níveis para preservar o sistema de slots existente.
- Catálogo futuro de aliens criado sem adicioná-los aos mapas atuais.
- Lasers ativos da Loja: LF-1, MP-1, LF-2, LF-3 e LF-4; SL-01 fica apenas como legado de saves antigos.
- MP-1 respeita dano PvE próprio; LF-3 aplica +15% contra aliens.
- Munições laser: x1, x2, x3, x4 e SAB-50. SAB drena escudo inimigo em x2 e transfere a energia capturada para o escudo do jogador, sem causar dano ao casco.
- Novos modelos de escudo preparados: FS-01/02/03/04, SG3N-B00 e linha SG3N atualizada.
- Naves sem habilidade entram na progressão normal da Loja com preços robustos. Naves com habilidades especiais ficam marcadas como Evento/Missão/Passe, com Leonov como exceção vendável.
- Missões podem conceder aleatoriamente lasers, escudos, munições e mísseis como bônus.
- Materializador do Galaxy Gate agora custa 100 Uridium por giro.


## V10.2 — HUD Command Center

### Menu superior compacto
- Nova sequência fixa: MAPA → GG → MISSÕES → LEILÃO → LOJA → HANGAR → CONF.
- Perfil de Piloto e P.E.T. saíram do menu superior e foram centralizados no Hangar.
- Porão saiu do menu superior; comércio aparece apenas na base X-1.
- Status superior foi reduzido para Piloto, LV, Créditos, Uridium e conexão.

### HUD da nave e P.E.T.
- Painel da nave agora mostra somente HP, ESC, VEL e PORÃO.
- Removidos retrato da nave, coordenadas, rota e exploração desse painel.
- Novo painel flutuante do P.E.T. ao lado da nave, com seletor rápido de modo: Companhia, Guardião, BOX, Pedras, Reparação e Kamikaze conforme os módulos possuídos.

### Central CONF
- CONF substitui o antigo botão SAIR.
- Qualidade ALTA: até 60 FPS, DPR 2, fundos e efeitos completos.
- Qualidade MÉDIA: até 45 FPS, DPR 1.35, menos estrelas/efeitos pesados.
- Qualidade BAIXA: até 30 FPS, DPR 1, fundo procedural, cache/preload reduzidos e menos efeitos para economizar memória, bateria e dados.
- Configurações persistentes de visibilidade para Nave, P.E.T., Minimap, Munições e HUD do Galaxy Gate.
- Logout agora fica dentro de CONF.

### Hangar unificado
- Novas abas: NAVES → EQUIPAMENTOS → DRONES → P.E.T. → PERFIL DE PILOTO.
- O Perfil de Piloto completo agora pode ser administrado dentro do Hangar.
- O P.E.T. também pode ser comprado, equipado e configurado dentro do Hangar.

### Base / Porão
- Ao entrar na base X-1 aparece o botão flutuante BASE / VENDER RECURSOS, no estilo do prompt de portal.
- O Porão comercial só abre na base.

### Organização de Loja
- EXTRAS são únicos por conta: se o item já estiver no inventário ou equipado, ele desaparece da Loja.
- P.E.T. base desaparece da Loja depois da compra.
- Módulos P.E.T. comprados também desaparecem da Loja P.E.T.
- Itens Elite únicos já possuídos são retirados do catálogo pessoal do Leilão.

### Venda de equipamentos
- Equipamentos no inventário podem ser vendidos diretamente por 50% do preço original de Loja.
- Comuns devolvem Créditos; Elite devolvem Uridium.
- A mesma opção aparece no inventário de equipamentos do P.E.T.
- A venda em 50% também aparece nos slots equipados; drones vendidos devolvem os equipamentos instalados ao inventário e pagam 50% do próprio valor.

## V10.3 — Premium Online
A central CONF agora concentra configurações de jogo, ranking online e gerenciamento da conta. O ranking usa os perfis persistidos no Supabase e possui classificações independentes por nível, XP, aliens destruídos e Galaxy Gates concluídos.

O Leilão Elite foi migrado para persistência online: lances ativos ficam registrados em `auction_bids`, sobrevivem a refresh/login e os Créditos em garantia deixam de ser subtraídos antecipadamente. O valor vencedor só é cobrado no fechamento do ciclo. Itens únicos já possuídos são filtrados automaticamente.


## V10.4 — Galactic Balance
- Modo ALTO recebeu fundo mais vivo, resolução 2.35 DPR, mais partículas, preload total e sprites carregados em modo eager.
- 30 naves novas agora possuem sprites individuais próprios gerados para o Stellar Legacy.
- Novo painel flutuante MISSÕES ATIVAS com paginação por bolinhas e progresso em tempo real.
- Economia de aliens atuais rebalanceada para o preço V10 dos equipamentos.
- Missões Diárias: bônus 10X dos alvos; mineração diária inclui 3M CR + item/munição garantido.
- Semanais: 7X. Mensais: 5X. Especiais: 3X.
- Itens e munições de bônus de missão tiveram chance/quantidades melhoradas.
- Galaxy Gate herda automaticamente os novos valores-base dos NPCs e continua fechando 3X na conclusão.


## V10.4.1 — Cargo Box Decay
- Cargo boxes de aliens permanecem no mapa por no máximo 30 segundos.
- Nos últimos 5 segundos piscam para avisar que vão desaparecer.
- O P.E.T. Coletor de BOX respeita o mesmo cooldown.


## V10.5 — Online Universe
- Pilotos autenticados passam a aparecer online no mesmo mapa com nave, nome, nível, HP e escudo.
- Movimento remoto é suavizado por interpolação; posições são sincronizadas pelo Supabase a cada ~1,8s.
- Galaxy Gates continuam privados/instanciados e não exibem outros jogadores.
- Jogadores online também aparecem como pontos verdes no minimapa dentro do alcance do radar.
- Leilão deixa de ter qualquer lance simulado do sistema.
- Cada lote inicia em 100.000 Créditos e só sobe quando outro jogador real cobre.
- Se você já lidera o lote, o botão fica bloqueado: não é possível cobrir o próprio lance.
- O banco serializa os lances por lote para impedir corrida de dois jogadores ao mesmo tempo.
- Quando outro piloto cobre você, sua garantia é liberada e o cliente sincroniza o novo líder.
- Naves, EXTRAS e módulos únicos do P.E.T. já possuídos continuam ocultos do seu leilão.


## V10.6 — PvP Frontier
- PvP real entre companhias.
- Proteção assimétrica nas bases X-1: invasor não inicia combate; defensor pode abrir retaliação.
- Territórios de facções agora são instâncias online separadas e podem ser invadidos pela navegação.
- Minimap mostra somente NPCs e pilotos inimigos, usando marcadores diferentes.
- Leilão voltou a ter preço automático crescente antes de lances, mas o sistema congela assim que um jogador entra no lote.
- Nenhum lance real pode ser coberto pelo sistema.


## V10.6.1 — Auction 100k Hotfix
- O primeiro jogador pode dar exatamente o preço atual do sistema.
- Portanto, quando o lote estiver em 100.000 CR, 100.000 CR é um lance válido.
- Depois do primeiro jogador, somente outro jogador pode cobrir, com incremento mínimo de 100.000 CR.


## V10.6.2 — Auction Repair & Sections
- Corrigido definitivamente o fluxo de DAR LANCE, contornando o RPC antigo que retornava `lot_ref is ambiguous`.
- Lance é gravado online e verificado novamente no mercado para resolver concorrência simultânea.
- Garantia de lances já superados é liberada.
- Leilão organizado em Naves, Munições & Mísseis, Equipamentos, Extras e P.E.T.


## V10.6.3 — HUD Activity & Ore Economy
- Minérios agora possuem valor de venda compatível com a economia atual.
- Missões de mineração herdam os novos valores.
- Painel flutuante ATIVIDADE registra recompensas e ações recentes.
- Missões Ativas e Atividade podem ser mostradas/ocultadas em CONF.
- Status ONLINE/LOCAL foi removido visualmente do topo.


## V10.6.4 — HUD Cleanup
- Barra horizontal de ALVO removida.
- Sistema de seleção e combate continua intacto.
- Informações rápidas de seleção continuam aparecendo via ATIVIDADE/toast.


## V10.6.5 — Smart Ammo
- Laser troca automaticamente para uma munição mais fraca quando a ativa acaba.
- Mísseis fazem a mesma troca automática por ordem de dano.
- CPU Auto Buy atua somente sobre o laser e o míssil selecionados.
- Se o Auto Buy não puder repor a munição ativa, o jogo usa automaticamente a próxima reserva mais fraca.
- P.E.T. Guardião acompanha a mesma munição selecionada e a mesma lógica de fallback.


## V10.6.6 — Slim Ammo HUD
- Munições agora ficam em uma barra fina fixa no rodapé.
- Interface ocupa uma única linha no desktop.
- Botões de munição, LASER e MÍSSIL foram compactados.
- Em telas menores, munições deslizam horizontalmente sem roubar altura do mapa.


## V10.6.7 — Target Cleanup
- Removida definitivamente a barra visual de alvo.
- Seleção de NPC/PvP passa apenas para ATIVIDADE.
- Toast corrigido para voltar a ser uma notificação pequena e flutuante.


## V10.6.8 — Ship Organizer
- Loja esconde naves que a conta já possui.
- Hangar organiza primeiro as naves adquiridas e depois o restante do catálogo na ordem normal.


## V10.6.9 — Shield Regeneration
- Escudo espera 5 segundos após o último dano antes de regenerar.
- Escudo padrão ou com Repair Bot Comum: 1% do máximo por segundo.
- Repair Bot Elite também aumenta a regeneração do escudo para 2% por segundo.
- Novo dano interrompe a regeneração e reinicia o cooldown.


## V10.7 — Route Network
- Rotas físicas e mapa visual passam a usar a mesma topologia.
- Portais são posicionados automaticamente perto das bordas na direção estratégica do mapa conectado.
- Bases 1-1/2-1/3-1 agora possuem posições próprias.
- 3-2 não conecta mais ao 4-3; 3-3 conecta ao 4-3 e também ao 2-3.


## V10.8 — Base & Bonus Economy
- Nova estação orbital integrada à base.
- Bônus de Salto passa a ser obrigatório para teleporte direto pelo Mapa; portais físicos continuam grátis.
- Phoenix tem reparo gratuito.
- Outras naves consomem 1 Bônus de Reparo ou 500 URI após serem destruídas.
- Sem recursos de reparo, a nave fica bloqueada na base até reparar ou trocar para Phoenix.


## V10.9 — Arena PvP
- Arena PvP online com adversários reais registrados no Supabase.
- Cada piloto possui 10 ataques por dia, com reset à meia-noite no horário de São Paulo.
- Limite validado no servidor, sem reset por F5/localStorage.
- Snapshot da nave: HP, escudo, dano laser, velocidade, nível, nave e facção.
- Matchmaking prioriza pilotos de poder semelhante.
- Histórico online, vitórias, derrotas e rating.
- Rating inicial 1.000: vitória +25, derrota -10.
- Defender atacado não consome uma das próprias 10 tentativas.
- Botão ARENA no menu e atalho A.


## V10.9.1 — Fixed Regeneration
- Base / Repair Bot Comum: +5.000 HP por segundo.
- Repair Bot Elite: +10.000 HP por segundo.
- Escudo: +10.000 por segundo; com Repair Bot Elite, +15.000 por segundo.
- Fora da Base, regeneração exige 5 segundos sem receber dano.
