## V20.2.9 — Configurações Mobile, FPS por Cena
- Interrompe apenas desenho atrás de CONF; simulação e sincronização continuam.
- Renderização de configurações sob demanda; ranking renderizado somente na aba correspondente.
- FPS e amostras separados para jogo e configurações; evita medir transições como travamentos.
- Atualização das métricas do painel só enquanto ele está visível.

## V20.2.8 — Otimização do HUD guiada por diagnóstico (Android / BAIXA)
- Diagnóstico recebido da V20.2.7: 14,7 FPS; interface HUD p95 22,4 ms; jogabilidade p95 4,8 ms; serviços p95 2 ms; Canvas p95 8,8 ms.
- Novo módulo `public/modules/hud-content-cache.js`: só altera textos e URLs de sprites do HUD quando seus valores mudarem.
- Reconciliação de menus do ADM/nível passa a ocorrer por assinatura de nível e configuração no ciclo periódico; chamadas explícitas continuam imediatas.
- Munições com assinatura de estoque, seleção e custo por disparo: não recria tooltips/atributos quando não muda; invalida ao reconstruir botões.
- Evita varredura `Array.from().filter()` para hostis do radar no HUD; contador sem array temporário.
- Mantidas atualizações de HP/escudo/alvo/cooldowns e configurações CONF1/2 na trilha rápida; nenhuma alteração de balanceamento ou velocidade de simulação.
- Perfil local adiciona HUD completo p95, HUD crítico p95, HUD munições p95 e número de amostras de HUD completo; tudo sem envio de dados.
- Testes unitários e regressivos adicionais, sem alterações em SQL, servidor de combate, sprites, lojas ou saves.

## V20.2.7 — Diagnóstico de gargalos JS e cadências auxiliares
- Recebido diagnóstico V20.2.6: 12,4 FPS, atualização JS p95 20,3ms, Canvas p95 7,1ms.
- Instrumentação opt-in por etapa: gameplay, serviços/eventos, HUD e espera entre quadros.
- Retirada alocação de array por frame no controle de respawn; clock de NPC compartilhado.
- Auxiliares com cadência moderada; PvP 4-X mantém checagem por frame.
- Sem SQL ou mudança intencional de combate, save ou assets.

## V20.2.6 — Performance NPC (render LOD) + diagnóstico separado

- `public/modules/npc-render-detail.js`: classificação `full`, `bars`, `sprite` somente para apresentação de NPCs comuns distantes no gráfico BAIXO.
- `public/game.js`: caminho Canvas simplificado na qualidade BAIXA; preserva imagem original, chefes, eventos, selecionado; tempo JS e Canvas coletados separadamente apenas com diagnóstico ativo.
- `public/modules/performance-monitor.js`: P95 de simulação e desenho, preservando a interface de medição antiga e limite de amostras.
- `public/index.html`: duas métricas P95 adicionais em CONF → JOGO.
- `tests/npc-render-detail-v2026.test.mjs`, `tests/performance-breakdown-v2026.test.mjs`: novos testes; `tests/performance-ui-v2022.test.mjs` atualizado para ordem de chamadas com medição separada.
- `package.json`, `server/index.js`, imports frontend: versão 20.2.6.
- Não modifica SQL, schemas, save, autenticação, PvP ou combate.

## V20.2.5 — otimização conservadora do Canvas (Android / BAIXA)

- Fundo gráfico BAIXA pré-reduzido em Canvas 1024 px, cache LRU máx. 2 cenários (`modules/backdrop-raster-cache.js`).
- Minimapa não é desenhado quando recolhido/oculto; borda e base não são desenhadas se estão fora da câmera.
- Medições de texto do callsign são reutilizadas com LRU 128 (`modules/text-width-cache.js`).
- Resize evita reinicializar o contexto se nada mudou; QA: regressões de gameplay intactas.
- Release `20.2.5` em servidor, HTML, imports, pacote e diagnóstico; nenhum SQL adicionado.

## V20.2.4 — HUD mobile: cadências independentes e layout agrupado

- Ciclo de simulação, movimento e combate preservado; somente o ritmo das atualizações de interface muda.
- Em BAIXA: atualizações críticas ~140 ms; munições ~380 ms; painel completo ~850 ms. Menus e chamadas explícitas de `updateUI` atualizam na hora.
- Layout de HUD consolidado em um `requestAnimationFrame` por ciclo, com leituras de geometria antes das escritas CSS e prevenção de valores CSS repetidos.
- Cache dos gráficos, diagnóstico, persistência, SQL e rotinas servidor inalterados.
- Testes automáticos ampliados e URLs versionadas como 20.2.4.

## V20.2.3 — Cache de gradientes e culling sem alocação
- Reaproveita gradientes estáticos de fundo, iluminação secundária e nébula.
- Testes de visibilidade sem alocação de bounds por entidade.
- Nenhuma regra de combate, mapa, save ou SQL alterada.

## V20.2.2 — Monitor de Desempenho Local (Etapa 3)

- Diagnóstico voluntário de FPS, quadros longos, percentil 95, tempo do desenho, cache e heap JS (quando suportado).
- HUD opcional e botão para copiar relatório local sem dados de conta.
- Nenhum SQL ou alteração deliberada de combate, saves, Render ou Supabase.
- Verificações de release e testes automatizados ampliados.

## V20.2.1 — Motor gráfico (Etapa 2)
- Cache de imagens isolado em módulo com retry e limpeza cuidadosa de fundos inativos.
- Sprites de entidades protegidos; conteúdo visual não alterado.
- Testes do cache integrados à verificação de release.
- Sem SQL novo, sem alteração em saves e regras de combate.

## V20.1.4 — Botões CONF 1 / CONF 2 no HUD NAVE (mobile)

- Interface Android: troca de configurações dentro do painel NAVE, independente do menu MUNIÇÕES recolhido.
- Botões acessíveis em tela pequena, com PRONTO / 5s visível. Sem duplicar ações, sem alterar cálculo de escudo nem persistência.
- Mantidos assets, PvP contínuo, dois perfis táticos e fluxos ADM.

## V20.1.3 — Configurações táticas e escudo persistente
- CONF 1 e CONF 2 alternáveis a cada 5s; setups independentes de nave/drones no mesmo casco.
- Escudos absolutos e HP comum; nenhuma cura na troca, na atualização de equipamentos ou no relogin.
- Barra rápida HUD + edição no Hangar; remoção em lote na Nave, Drones e AUX-9.
- Preserva inventário, PvP contínuo e todos os sistemas da V20.1.2.

## V20.1.2 — PROGRESSÃO INICIAL + ROTA FULL ELITE
- Reforços únicos de recompensas LV3,5,7,10,12,15,18,22; total +49 mi CR / +50 mil STL (pagos ao longo da progressão).
- Novo monitor em Passe: nave Comum, 4 Nova, build Elite; tempo ativo medido desde a versão.
- Nenhuma alteração de preços, drops, NPCs, XP, Premium, PvP ou dados existentes.

## V20.1.0 - SPRITES + PvP Battle 4-X (15/10/2026)
- Clique/toque em naves de outros jogadores nos mapas 4-1,4-2,4-3, incluindo mesma faccao.
- Nenhum PvP nos mapas X-1..X-8; membros do mesmo grupo sao protegidos.
- RPC Supabase valida mapa, presenca, distancia, dano e cooldown; sem wipe de dados.
- 8 sprites PNG novos e transparentes de equipamentos especiais.
- 128 testes aprovados; teste real com duas contas segue pendente.

## V20.1.0 - SPRITES + PvP Battle 4-X (15/10/2026)
- Clique/toque em naves de outros jogadores nos mapas 4-1,4-2,4-3, incluindo mesma faccao.
- Nenhum PvP nos mapas X-1..X-8; membros do mesmo grupo sao protegidos.
- RPC Supabase valida mapa, presenca, distancia, dano e cooldown; sem wipe de dados.
- 8 sprites PNG novos e transparentes de equipamentos especiais.
- 128 testes aprovados; teste real com duas contas segue pendente.

## V20.0.0 — Integridade, Economia, Endgame (14/10/2026)

# STELLAR LEGACY — V20.0.0 | ATUALIZAÇÃO POR ETAPAS

## Etapa 1 — Integridade
- ADM → BOX BÔNUS permite configurar X-1 a X-8 e 4-1 a 4-3.
- SQL conserta função segura `admin_update_bonus_box_config_v1825` para não remover X-5..X-8.
- Cupom EVENTO7D legado (resgate puramente local) DESATIVADO. Novos cupons passam pelo RPC autenticado `redeem_game_coupon_v193`; recriar ofertas na área ADM → CUPONS.
- Benefícios PREMIUM locais existentes não são mais aceitos como autorização: o servidor deve possuir `premium_until`. Contas com benefício local não assinado precisam de regularização ADM individual.
- Textos de porão e expansora de slots corrigidos (sem modificar atributos atuais).

## Etapa 2 — Economia e Passe
- 6 receitas corrigidas: PLS-2 (20k CR + 20/20/20 básicos), CMT-2 (50k +20 Cryon/50 Virel), Ferrite (30k +75/50/25 básicos), Duracite (25k +60 Cryon/45 Virel/3 Ferrite), Solarium (50k +1 Voidite/3 Duracite/3 Ferrite), nanorreparo (150k +2 Duracite/10 Cryon/10 Ferron).
- Outubro mantém 500 pontos/tier. Novembro, se ainda não estiver criado: 30 tiers, 350 pontos/tier, 100 pontos por missão; aproximadamente 21 dias perfeitos para fechar.
- Prêmios finais de novembro: ARC-X no tier free, ARC-Ω no premium. Os outros tiers são copiados de outubro e ficam editáveis no ADM.

## Etapa 3 — Progressão tardia e AUX-9
- X-5=2, X-6=3, X-7=4, X-8=5 unidades por pedra normal (mesmos tipos, mesmas quantidades de pedras). Evento permanece com quantidades independentes.
- AUX-9 recebe XP por XP de NPC com teto 2.000 normal / 3.500 boss, não mais diretamente por créditos/STL da kill.
- Rendimento por pedra não é atualmente editável no ADM; está em `public/data.js`, precisa versão para alterar. Esta primeira implantação preserva a consistência do servidor.
- Warfront: NÃO foram adicionados créditos/STL por captura sem regra anti-exploit autoritativa, para não permitir geração fraudulenta de moeda. Requer etapa online específica.
- Drops raros: ARC-X e ARC-Ω via passe de Novembro; THR-7 e Nanobot Prime via ADM cupons. Nenhuma queda PvP aleatória injetada sem teste.

## Etapa 4 — Testes e Instalação
- Testes de regressão automatizados e de economia documentados, sem afirmar testes reais PvP multiplayer.
- Os scripts SQL são idempotentes para repetição controlada mas não substituem revisão de alterações feitas simultaneamente no ADM.
- Subir ZIP completo via workflow principal GitHub; publicar Render. SQL aplicado separadamente no Supabase, caso confirmado.
- Não sobrescrever a versão V20 com V19.x após o deploy.

---

## V19.0.17 — BALANCEAMENTO DE EVENTOS
- 31 naves de evento equilibradas por funcao; 4 escudos reajustados.
- Novos ARC-X, ARC-Ω, THR-7 e Nanobot Prime somente para recompensas de evento.
- Catálogo de cupons ADM expandido de 99 para 103 recompensas.
- SQL com snapshot de seguranca e rollback protegido; atributos editáveis no ADM → BALANCEAMENTO.
- Sem mudanças em lojas, NPCs, economia, jogadores e graficos.
- Testes de regressao: 112 passaram.

## V19.0.16 — Leilão configurável no ADM
- Conversão STL → CR, multiplicadores por categoria, exceções por item e prévia em tempo real; piso do Nova mantido.
- Preço inicial calculado pelo catálogo verdadeiro no Supabase, com defesa contra pisos falsos enviados pelo navegador.
- Sem alterações em mapa, NPCs, loja, assets ou lances existentes.

## V19.0.15 — XP do piloto calibrado para ~150h do nível 7 ao 32

- Curva LV1–10 preservada; novos marcos LV18/22/27/32 para X-5/6/7/8.
- Saves anteriores preservam nível e percentual de progresso na migração única V1915.
- Validações SQL de Arena e Clã sincronizadas com os dois modelos de XP.
- Testes de regressão e instalador original preservados.

## V19.0.14 — Recursos normais, BOX no alto mapa e portal da 2ª base
- Mapas 4-X sem minério normal (ore_count 0), inclusive depois de criar a sala.
- Apenas três tipos iniciais de minério nas áreas comuns; X-5 a X-8 cadastrados online com esses pools.
- X-5 a X-8 com 20 BOX BÔNUS por mapa (Supabase online + fallback), independentemente das pedras.
- Portal do X-8 afastado da base na Terra/Marte/Júpiter; cliente e servidor usam coordenadas idênticas.
- NPCs de evento, recursos específicos de evento, progressão por nível, restrição de facção e PvP 4-X preservados.
- Testes automatizados e dados online validados.

## V19.0.13 — 4-X PvP público interfacções
- Mapas 4-1, 4-2 e 4-3 livres para todas as facções com nível mínimo 15.
- Portais PvP e navegação no mapa estelar corrigidos; setores X-1 a X-8 continuam protegidos por facção.
- Servidor aceita pilotos autorizados de qualquer facção na mesma sala PvP; ADM continua livre.
- Nenhuma migração SQL nova.

## V19.0.10 — REGENERAÇÃO ADMINISTRÁVEL (HP + ESCUDO)
- Robôs de reparo Comum/Elite agora aplicam `repairTick`, `shieldRepairTick` e `repairDelay` do Supabase em tempo real; remove valores fixos no combate.
- Mantém reparo da base, regeneração natural de escudo, multiplicadores Premium/designers e exceção de HP sem robô.
- Zero permitido para pulso ou espera; limites e fallback para versões antigas; teste automatizado do cálculo de pulsos.
- Sem SQL novo nem mudanças no instalador principal.

### V19.0.8 — ADM Fase 03A: criação de conteúdo (2026-10-13)
- Missões personalizadas com criador visual, objetivos e recompensas.
- Criadores de serviços, crafting e temporadas do Passe.
- Seleção de temporada e editor de piso de preços do Leilão, protegido pelo servidor.
- SQL único V19_0_8_ADMIN_CONTEUDO.sql.

## V19.0.7 — Correção de visibilidade do ADM Portais Astrais
- Corrigida referência ausente `adminRuntimePortalsPanel` no registro `ui`.
- Painel de ondas visível mesmo quando os preços do Materializador falham em carregar.
- Cartões dos Portais não são recolhidos automaticamente; cada Round mantém expansor próprio.
- Mensagens permanentes de falha ao carregar a configuração de ondas.
- Preservação do rascunho de ondas quando os custos recarregam.
- Cache-bust dos assets para V19.0.7.
- Sem novos comandos SQL nem alterações em dados de jogadores.

## V19.0.6 — ADM fase 2 (Portais Astrais, ondas e economia)
- Editor visual para Aurora, Nexus e Eclipse: NPCs, ondas, rounds, intervalos, escalas e recompensas.
- Configuracao versionada no Supabase, protegida por RPC administrativa e limites de quantidade.
- Novas vidas nao saem do Materializador: o antigo premio raro vira bonus de salto. Reservas anteriores continuam utilizaveis.
- Vida adicional custa 10.000 STL (na base X-1, autorizacao pelo servidor).
- Corrigida normalizacao que restaurava vida zero em determinados saves.
- Tentativas iniciadas preservam o snapshot das regras ate a conclusao.
- SQL obrigatorio: sql/V19_0_6_ADM_PORTAIS.sql.

## V19.0.5 — ADM fase 1 (organização + formulários visuais)
- Reorganiza a navegação ADM em grupos: Visão Geral, Interface, Mundo & Mapas, Sistemas, Eventos, Passe, Preços, Portais Astrais e Cupons.
- Mundo reúne NPCs, mapas, recursos, setores, rotas e BOX; custos de giro ficam em Portais Astrais.
- Missões, Economia, Crafting e recompensas do Passe recebem editor visual com itens, valores, listas e botões de adicionar/remover, preservando estrutura de dados já usada pela API.
- Cards administrativos recebem controles de expandir/recolher.
- Designers ativos são destacados com borda exclusiva, e o Perfil de Piloto ganha detalhamento expansível de atributos e fontes de bônus.
- Sem alteração no Supabase, preços, economia, níveis, distribuição de vida, ondas ou recompensas: mudanças sensíveis ficam para as próximas etapas.

## V19.0.4 — FACÇÕES + LOGO SEM V8
- Logo novo e emblemas novos de Terra, Marte e Júpiter; ajuste responsivo no login e seleção da facção.

## V19.0.3 — CENTRAL ADM DE CUPONS
- Editor de cupons em ADM → CUPONS, com escolha entre 99 prêmios do catálogo V19.
- Até 12 recompensas por cupom: Premium (dias), Passe Premium da temporada, naves comuns/Elite/evento, lasers, geradores, extras, drones, munições, mísseis, recursos, Créditos e STL.
- Código personalizado ou automático, limite global de resgates, um resgate por conta, nível mínimo, ativação/desativação e datas de início/fim.
- Resgate validado pelo Supabase em transação, sem pagamentos; itens e benefícios entregues somente após validação do servidor.
- Mantém cupons legados V18.2.1. Login, saves e lojas permanecem intactos.
- SQL `sql/V19_0_3_CUPONS_ADM_CATALOGO.sql` aplicado no Supabase durante a implementação. Não precisa executar ao atualizar Render.
- Testes de autorização ADM, resgate, Premium/Passe, bloqueio de duplicidade, compatibilidade de códigos antigos e scripts de regressão.

## V19.0.2 — Cargos e pedidos para alianças; Arena XP e nível seguros

- Líder, Vice-líder, Membro Elite e Membro.
- Solicitação de entrada obrigatória, aprovações do Líder/Vice e cancelamento de pedidos.
- Repasse do cofre disponível para vice; guardas de nível/XP/roles no Supabase.
- Arena usa curva de XP atual da V19, sem pular níveis indevidamente.
- Auditoria nas RPCs de clã, progressão Arena e permissões de cofre.
- Sem alterações nos saves ou na economia existente.


## V19.0.1 — Arte integrada no Perfil de Piloto + Loja Premium
- adicionadas artes individuais para todas as pesquisas de DEFESA, UTILIDADE e ATAQUE no Perfil de Piloto;
- adicionadas artes dedicadas para categorias da vitrine/Loja Premium de teste;
- novos assets em `public/assets/v19/pilot-skills` e `public/assets/v19/premium-stage`;
- ajustes visuais no layout dos cards para acomodar as novas imagens sem poluição visual.

## V19.0.0 — LIMPEZA VISUAL + EQUIPAMENTOS + ATAQUE DA NAVE (2026-10-13)
- Removida aba legada da vitrine Premium (backend antigo isolado); mantida vitrine de teste com fail-closed.
- Avisos e regras reduzidos e deslocados para detalhes no rodapé; cupom Premium recolhível.
- Corrigidos 9 sprites de munição e mísseis em WebP, SIP-2 diferente da PLS-3 e ícone do Terminal Mercante Remoto Elite.
- 9 pesquisas ATAQUE remodeladas sem upgrades do AUX; salvamentos e IDs legados preservados, novos efeitos reais de nave/drones.
- Documentos V18 reorganizados em `docs/historico-v18/` (não excluídos); release sem SQL.
- 17 testes/scripts de regressão passaram, incluindo cenário de save antigo com PP investido.


## V18.2.15 — PASSE + EQUIPAMENTOS ELITE / EVENTO (TESTE)
- Aba Passe reúne Passe de Temporada e níveis; nova aba Equipamentos contém Elite I/II e naves Phantom/Seraph. Novas ofertas já cadastradas em SQL V18.3.6. Sem pagamento ou entrega real.

# V18.2.14 — RECARGAS STL / PACOTES COMPRA ÚNICA (TESTE)

Ver `V18_2_14_RECARGAS_STL_E_PACOTES.md`.

## V18.2.12 — NOVA NO LEILÃO: 100M CR FIXOS NA ABERTURA
- Piso de abertura de 100.000.000 CR por lote NOVA, igual para todos os jogadores; não escala com quantidade de drones.
- Banco rejeita qualquer lance abaixo de 100M CR, inclusive quando o navegador envia um `systemFloor` antigo.
- A tela agora mostra a abertura correta, inclusive em lotes antigos salvos no navegador. O lance automático segue subindo durante o ciclo de uma hora.
- Não altera a Loja, lances históricos, Halo ou outras categorias de leilão. Banco já preparado, sem SQL adicional.

## V18.2.11 — NOVA: PISO DE LEILÃO 2× HALO
- O lote do NOVA (item:iris) começa com no mínimo 2× o preço base do HALO em Créditos: 10.000.000 CR → 20.000.000 CR atualmente.
- O HALO permanece disponível na Loja; não foi adicionado como lote Elite. Valores da Loja preservados.
- Backend Supabase valida o piso independentemente do navegador e corrige ambiguidade em colunas do RPC de lances.
- UI do leilão atualizada (incluindo saves antigos) e versão do cache renovada; lances já ativos não são reescritos.
- Banco do projeto atual já atualizado; o SQL completo está incluído em `sql/V18_2_11_AUCTION_NOVA_FLOOR.sql` para referência.

## V18.2.10 — AUX-9: SEÇÕES RECOLHÍVEIS NO HANGAR
- Os painéis de Designers e Modos/Extras do AUX-9 agora começam recolhidos, mantendo o Hangar compacto.
- Um botão com seta abre e fecha cada seção independentemente, com animação suave e acessibilidade por teclado.
- O cabeçalho mostra designer e modo ativo, incluindo a quantidade de módulos comprados.
- Preferências persistidas no navegador: fechar o Hangar, alternar abas ou relogar não reabre automaticamente os cards.
- Também funciona no modal próprio do AUX-9; nenhuma alteração em compra, coleta, combate ou saves.
- Sem SQL; mantém economia e refinaria V18.2.9.

## V18.2.9 — HANGAR REFINARIA, TERMINAL MERCANTE ELITE & DRONES
- Refinaria/crafting funciona em qualquer mapa via Hangar > REFINARIA; base X-1 mantém venda do porão.
- EXTRA Elite Terminal Mercante Remoto: comércio manual fora da base, somente se equipado; servidor bloqueia contas sem o EXTRA.
- AUX-9 Salvager não vende mais caixas dos NPCs: coleta para o porão, conserva excedente enquanto caixa existir.
- Drones Halo/Nova: preço base 10M CR/15K STL e multiplicador por compra do tipo (2× padrão), histórica sem reset ao vender.
- Loja no ADM permite editar preços bases e o multiplicador (1–4).
- Preservados sprites de nave/NPC, modo BAIXO, eventos, cupons, BOX BÔNUS, Premium e modos online.

# V18.2.8 — BOX Sprite & Ship Vitals Fix
- BOX BÔNUS: corrige imagem lazy não carregada no Canvas; sprite WebP fica visível.
- BX/Poeira: cache protegido e versão da imagem por pasta, sem recarregar todas as naves.
- Fallback da BOX não é mais quadrado chapado.
- Barras de HP/escudo seguem o piloto no mapa, mesmo com HUD NAVE recolhido, compatíveis com modo BAIXO.
- Economia, ADM, AUX e eventos inalterados.

## V18.2.7 — AUX-9 EXTRATOR HOTFIX (10/10/2026)

- Corrige AUX parado em cima das pedras nos mapas online: WebSocket distinguia coletor nave/AUX, mas servidor validava somente a posição da nave.
- Coleta pelo AUX-9 agora exige EXTRATOR equipado e distância legítima entre AUX/pedra, com limite de radar e tether da nave para impedir coleta remota.
- Sincroniza posição do AUX imediatamente antes de enviar pedido, controla intervalo de tentativas e responde quando o minério já foi removido.
- Mantém exclusividade do minério por sala: sem duplicação de recompensa; a coleta entra normalmente nas missões, telemetria, eventos e XP do AUX.
- Em mapas locais, XP/telemetria e respawn do minério agora seguem o mesmo fluxo da coleta manual e a configuração do mapa.
- Nenhum SQL: mantém saves, efeitos, performance BAIXA, cupons, ADM e economia da V18.2.6.

## V18.2.6 — EVENTOS POR PERÍODO (10/10/2026)

- Corrige reinício do progresso de eventos ao atualizar o navegador, trocar de mapa ou recriar sala.
- Progresso individual por `user_id + event_id` persistido no Supabase e sincronizado quando o piloto entra no mapa.
- Abates e minérios coletados somam continuamente na mesma janela, independentemente do mapa elegível.
- Recompensa de conclusão contabilizada uma vez no Supabase, com registro imutável no save e proteção contra saves antigos.
- Mensagens `event_personal_update` são independentes do contador coletivo da sala.
- Novo BOSS de evento pode voltar após 25s para outros participantes, sem recompensar novamente quem já concluiu.
- Corrigido erro `SAVE_EVENT_STALE` com sincronização da versão atual do jogador.
- Mantidos: Loja, Bonus Boxes, Poeira Stellar, giros, Modo BAIXO, Smart Missions e painel ADM.
- Banco de produção já atualizado; migração incluída em `sql/V18_2_6_EVENTOS_POR_PERIODO.sql` apenas para documentação.

# V18.2.5 — ADM BOX BÔNUS LIVE

- Nova aba **BOX BÔNUS** na Central ADM, com quantidades por mapa, respawn, mínimos/máximos e pesos das sete recompensas, preço de STL e Poeira por portal, desconto Premium.
- Tabela e RPCs restritas no Supabase; atualização por ADM autenticado, bloqueio de usuários comuns e validação de valores.
- Preço de cada giro agora é carregado no servidor do banco de dados; valores mostrados no cliente vêm do mesmo runtime.
- Restrições de 0 BOX BÔNUS em Aurora/Nexus/Eclipse continuam fixas.
- Todos os saves antigos preservados.

# V18.2.4 — BOX BÔNUS POR MAPA

- X-1, X-2, X-3, X-4: 20 BOX BÔNUS por setor e piloto.
- Battle Maps 4-1, 4-2 e 4-3 (`b41`, `b42`, `b43`): 30 BOX BÔNUS por setor e piloto.
- Portais Astrais AURORA (`ggAlpha`), NEXUS (`ggBeta`) e ECLIPSE (`ggGamma`): **0 BOX BÔNUS**. Dados legados de caixas destes portais são eliminados ao acessá-los (sem tocar na Poeira Stellar acumulada ou nas recompensas).
- Migração V18.2.3 → V18.2.4 sem duplicação de caixas em cooldown: as novas vagas são criadas sem consumir/antecipar reposições pendentes. Quantidade de caixas ativas chega ao novo limite após os respawns.
- Coleta pelo piloto e AUX-9 Salvager, sete prêmios, cooldown 40–70s, preço dos giros, modo BAIXO e Smart Missions mantidos.
- Testes: distribuição por mapa, persistência, migração, ausência de caixas nos portais e regressões de loja/cupons.
- Sem alterações SQL; deploy do ZIP atualiza JS e cache de assets para `18.2.4`.

# V18.2.2 — SMART MISSIONS / JORNADA RECOLHÍVEL

- JORNADA DO PILOTO: ao completar treinamento, card sai do topo das missões e passa para o fim da tela com status FINALIZADA; recolhido automaticamente na primeira conclusão e abre/fecha ao tocar no cabeçalho. Preferência gravada localmente; jornadas ainda em andamento continuam em destaque no topo, mas também podem ser recolhidas.
- MISSÕES DIÁRIAS: escolhem NPCs comuns/minérios dos mapas atualmente acessíveis pelo nível do piloto, usando as configurações de mapas, minérios e spawns de NPC recebidas do Supabase. NPCs desativados ou sem spawn ativo não são sorteados.
- Metas diárias ajustadas ao nível e ao HP + escudo do alvo para evitar caçadas longas contra NPCs muito resistentes. Operação Combinada mistura NPCs e mineração sem obrigar a matar BOSS.
- Elegibilidade de semanais, mensais, especiais e contratos customizados conferida por alvo e mapa. Contratos ainda inacessíveis ficam ocultos (contagem de futuros na seção) e NÃO podem ser aceitos fora do nível permitido.
- Missões ativas salvam uma cópia estável dos objetivos, para o jogador não perder a missão ao subir de nível ou atualizar as configurações online.
- Migração de diária da versão anterior: substitui objetivo impossível automaticamente por um elegível, preservando apenas progresso de NPC/minério realmente correspondente e recalculando bônus parcial (sem duplicação de recompensas).
- Uma troca voluntária gratuita de diária por ciclo: escolhe outra opção disponível, sem reaproveitar a progressão abandonada; contratos completados continuam completados no dia.
- Biblioteca de contratos semanais/mensais/especiais com cache local por nível e versão de NPC/mapas/sistemas para manter a renderização leve em celular.
- Recompensa fixa da diária de mineração ajustada proporcionalmente à meta menor; chances de itens e economia existente mantidas.
- Nenhuma mudança de SQL necessária: usa APIs/data-driven já instaladas; sem alterar jogadores existentes, cupons, save online ou módulos de servidor. Requer deploy deste ZIP para o cliente receber o novo comportamento.
- Base V18.2.1 CUPONS SQL-FIRST + V18.2.0 MOBILE LITE integralmente preservadas.

# V18.2.1 — CUPONS SQL-FIRST / RESGATE POR SUPABASE

- Sistema de cupons dinâmicos com códigos e prêmios definidos por SQL; basta cadastrar INSERT nas próximas campanhas.
- Novo endpoint autenticado `POST /api/coupons/redeem` integra `redeem_game_coupon_v1821`.
- Campo LOJA PREMIUM → RESGATE ONLINE ligado ao servidor; `EVENTO7D` legado preservado.
- Cupom AUX-9 + Modo Sentinela migrado para o motor SQL, mantendo código, sem concedê-lo automaticamente.
- Suporte a recompensas permitidas: AUX-9, Sentinela/outros módulos do AUX, CR/STL, itens da Loja, munição, mísseis e naves.
- Validação no banco: validade, limite total, um uso por conta, níveis, valores máximos, anti-duplicação, auditoria.
- Proteção de saves para que cliente desatualizado não sobrescreva um prêmio resgatado em outra aba.
- Operação transacional no Supabase (sem SQL por cupom além de INSERT).
- Base V18.2.0 MOBILE LITE e HOTFIX de Loja integralmente preservados.
- Arquivos: `COUPONS_SQL_FIRST.md`, `sql/V18_2_1_COUPONS_SQL_FIRST.sql`.

# V18.2.0 — MOBILE LITE / QUALIDADE BAIXA

- Canvas da qualidade BAIXA passa de DPR 0,90 para 0,70 (cerca de 40% menos pixels desenhados por quadro, considerando a mesma tela).
- Mantém alvo de 30 FPS para preservar movimento e controles; jogo não mexe em ticks de combate, física ou rede.
- Na BAIXA, fundo preservado sem filtros CSS de saturação/brilho nem dois gradientes de sombreamento desenhados continuamente.
- Iluminação ambiental, estrelas decorativas e partículas secundárias reduzidas/desabilitadas apenas em BAIXA.
- Explosões e lasers permanecem visíveis, mas são menores, mais curtos e com menos faíscas, feixes, sombras e gradientes.
- Portais fora da tela não são desenhados; portais na BAIXA ficam com sprite, aro e nome estáticos e leves.
- Efeitos de foguetes, escudo e reparo exibem versões simplificadas apenas na BAIXA.
- Sprites originais de naves/NPCs/drones/AUX preservados; sombras, halos e filtros caros passam a ser desligados na BAIXA.
- Redesenho do minimapa limitado a cerca de 5–6 Hz quando na BAIXA (radar e entidades permanecem funcionais).
- Atualização visual do HUD limitada a ~6–7 Hz na BAIXA, reduzindo reflow/DOM; lógica e controles continuam na frequência normal e comandos atualizam a interface imediatamente.
- HUD no modo BAIXO sem backdrop blur e sombras CSS pesadas, mantendo interações e modais.
- Assets de imagens não mudaram de revisão; apenas JS/CSS com cache atualizado para 18.2.0.
- Nenhum SQL ou alteração em contas, progresso, lojas, assinaturas, economia, missões, NPCs ou servidor.
- Base da V18.1.9.1 com HOTFIX da confirmação de compra preservada.

# V18.1.9.1 — HOTFIX LOJA / CONFIRMAÇÃO DE COMPRA

- Corrigido clique de **COMPRAR** na aba LASERS da Loja Comum: botão deixava `onBuy` sem ação, portanto não abria a confirmação.
- Todas as categorias de equipamentos (`laser`, `generator`, `extra`) usam `buyItem()` para abrir a confirmação, preservando a validação autoritativa no servidor.
- Drones continuam com o caminho próprio (`buyDrone()`).
- Cache-busting de scripts/estilos em `18.1.9.1` para navegadores não reaproveitarem a versão defeituosa.
- Sem alterações de SQL, Supabase, preços, carteiras, servidor de compras, NPCs, gráficos ou salvamentos.

# V18.1.9 — ULTRA PERFORMANCE • MAPAS MAIS RAROS • FX BAIXA

- NPCs comuns e bosses normais ~30% mais raros em 7 mapas, sem mudar a taxa de respawn, missão, XP, drop ou eventos.
- `sql/V18_1_9_NPC_POPULATION.sql` altera o Supabase (Data Driven), com rollback dedicado.
- Fallback local `public/data.js` reduzido para manter densidade parecida offline/sem conexão SQL.
- Salas vazias deixam de simular NPCs; após 2 minutos sem jogadores são removidas da memória.
- Na entrada de novo jogador, o evento da sala em repouso é atualizado antes do snapshot.
- NPCs em 0–1.250u seguem 4 Hz; 1.250–2.200u usam até 2 Hz; distantes 0,4 Hz.
- Em clientes lentos, descartamos apenas frames de movimento quando há fila >256 KiB (sem perder estado de delta).
- Broadcasts idênticos para sala são serializados uma única vez.
- Explosões em qualidade BAIXA: flash simples, 2 faíscas (4 para boss), sem gradientes/sombras e vida visual mais curta.
- Explosões e impactos em MÉDIA/ALTA mantêm o desenho original.
- População acima da configuração é reduzida em tempo real, preservando alvos já reivindicados.
- A V18.1.8 de compressão, cache de imagens e rede incremental permanece integral.

# V18.1.8 — NETWORK OPTIMIZATION • BANDWIDTH REDUCTION

- Shared Universe mantém simulação autoritativa em 20 Hz, mas NPCs próximos passam a ser transmitidos em 4 Hz com interpolação no cliente.
- NPCs distantes recebem atualização lenta (2,5 s) e pacotes diferenciais enviam somente campos alterados.
- Cada jogador recebe atualização frequente apenas dos NPCs dentro de uma área de interesse de 2.200 unidades.
- WebSocket agora negocia `permessage-deflate` para compactar lotes maiores de realtime.
- Sincronização de jogador passa a ser adaptativa: combate 10 Hz, movimento ~6,7 Hz e ocioso ~0,67 Hz.
- Coordenadas/ângulos de rede são quantizados para reduzir JSON sem alterar a simulação interna.
- Eventos e Warfront tiveram broadcasts periódicos reduzidos; mudanças importantes continuam usando envio forçado.
- Respostas HTTP textuais usam gzip/deflate via `compression`.
- Assets gráficos ganham cache de 24 horas com revisão por versão; F5 e testes repetidos deixam de baixar as mesmas imagens.
- Preload de qualidade ALTA deixa de baixar todos os ícones de recursos antes de serem necessários.
- Snapshot inicial completo é preservado para garantir consistência ao entrar no mapa.

# V18.1.7C — LOJAS COMUM + PREMIUM DATA DRIVEN • STAGE 3

- Loja Comum passa a ser montada pelos produtos existentes no catálogo SQL marcados como ativos/visíveis.
- ADM controla preço, moeda, quantidade entregue, nível mínimo, ordem, aba, nome/descrição e disponibilidade.
- Loja Premium migra planos 7/30/90/180 dias para `premium_catalog_v12`; dias e preços deixam de ficar hardcoded no navegador.
- `shops.runtime.json` materializado pelo Render com fallback em disco.
- Compra comum valida visibilidade e nível mínimo no servidor. Compra Premium valida nível e duração configurada no banco.
- Passe Premium continua com preço vinculado à temporada da aba PASSE para impedir preço duplicado.

# V18.1.7B — PASSE DE TEMPORADA DATA DRIVEN • STAGE 2

- Temporada, início/fim, quantidade de tiers, pontos por tier, pontos por missão diária e preço Premium agora vêm do Supabase.
- 30 tiers atuais foram migrados preservando exatamente as recompensas Free/Premium existentes.
- Render materializa `pass.runtime.json` e o cliente usa fallback local se o runtime ficar indisponível.
- Central ADM ganhou a aba PASSE com editor da temporada e JSON de recompensa por tier.
- Loja Premium usa o preço e a chave da temporada ativa; compra do Passe não depende mais do mês `YYYY-MM` hardcoded.
- Temporada fora da janela pausa progressão e resgates.

# V18.1.7A — EVENT SCHEDULER • STAGE 1

- Corrige o resolver de eventos: vários eventos deixam de ignorar horários do Supabase.
- Adiciona modos INTERVALO, SEMANAL e ÚNICO.
- Agenda semanal suporta DOM–SÁB, horário oficial America/Sao_Paulo e duração editável.
- Central ADM ganha aba EVENTOS para ativar/desativar e editar calendário sem Git.
- Mantém os eventos atuais no modo INTERVALO por padrão, preservando a rotação existente.
- QA administrativo executado em transação com rollback.

## V18.1.6 FINAL — Central ADM Data Driven

- Consolida as etapas A → E da Central ADM em um único build estável.
- RUNTIME: monitora TOPBAR / NPCs / WORLD / SYSTEMS e força renovação dos snapshots temporários.
- INTERFACE: nome, ordem, nível mínimo, ativo/inativo e ocultação por nível.
- NPCs: atributos, recompensas, respawn e população por mapa.
- MUNDO: mapas, recursos, setores, portais e pools de minério.
- SISTEMAS: missões, economia e crafting.
- Mantém o fluxo seguro `Supabase -> Render -> JSON temporário -> jogo`, sem execução de HTML/JS vindo do banco.
- Nenhuma mecânica nova foi adicionada nesta consolidação; o objetivo é congelar a fundação Data Driven validada nas etapas anteriores.

## V18.1.6E — Admin Systems Editor • Stage 5

- Nova aba **SISTEMAS** em `ADM > CONFIGURAÇÃO AO VIVO`.
- Editor isolado para geradores de Missões, serviços da Economia e receitas de Crafting.
- JSON de configuração é validado no cliente e novamente no backend antes de chegar ao Supabase.
- Cada salvamento força regeneração de `systems.runtime.json`, sem deploy.
- RPCs de Sistemas corrigidas para preservar campos opcionais quando recebem `NULL`.
- Interface, NPCs e Mundo permanecem fora do escopo desta etapa.

## V18.1.6D — Admin World Editor • Stage 4

- Nova aba **MUNDO** em `ADM > CONFIGURAÇÃO AO VIVO`.
- Editor isolado de mapas, recursos, setores, portais e pool de minério por mapa.
- Cada gravação passa pelo backend autenticado, RPC administrativa e materialização imediata de `world.runtime.json`.
- Correção preventiva das RPCs de Mundo: parâmetros opcionais `NULL` agora preservam o valor atual em vez de cair em limites de `GREATEST/LEAST`.
- Sem alterações em Missões, Economia ou Crafting nesta etapa.

## V18.1.6C — Admin NPC Editor • Stage 3
- Nova aba **NPCs** dentro de Configuração ao Vivo no ADM.
- Edição isolada de nome, HP, escudo, dano, velocidade, CR, STL, XP, respawn e ativo/inativo.
- População por mapa editável somente para vínculos NPC/mapa já existentes nesta etapa.
- Cada SAVE passa pelo backend autenticado, grava no Supabase e força a regeneração de `npcs.runtime.json` no Render.
- Corrigida a segurança do RPC `admin_update_npc_v1811`: parâmetros numéricos `NULL` agora preservam o valor existente em vez de cair em limites de `GREATEST/LEAST`.
- Nenhuma edição de Mundo, Missões, Economia ou Crafting nesta etapa.

## V18.1.6B — Admin Interface Editor • Stage 2
- Aba **INTERFACE** no ADM para nome, ordem, nível mínimo, ativo/inativo e ocultação até o nível.
- Módulo ADM protegido contra auto-bloqueio.
- Cada SAVE regenera `topbar.runtime.json` sem redeploy.

## V18.1.6A — Runtime Monitor • Stage 1
- Monitor somente leitura para TOPBAR / NPCs / WORLD / SYSTEMS.
- Atualização manual dos snapshots temporários sem editar balanceamento.

## V18.1.5 — Data Driven Systems

- Missões: níveis, multiplicadores, metas diárias, steps semanais/mensais, pools de minério e chance de bônus via Supabase.
- Missões customizadas podem ser criadas/removidas por RPC administrativo sem alterar o Git.
- Economia 2.0: serviços da base agora vêm do Systems Runtime (custos, duração, escala por nível e efeitos).
- Crafting: receitas, ingredientes, custo, moeda, nível mínimo e produto final agora vêm do Systems Runtime.
- Render materializa `systems.runtime.json` com cache/fallback, no mesmo padrão estável da topbar/world runtime.
- Servidor valida crafting e serviços usando o mesmo snapshot do cliente, evitando divergência de preço/regra.
- Nenhuma alteração em posição, Warfront, Grupo de Batalha ou ownership de NPCs.

## V18.1.4 — Data Driven World

- Novo World Runtime: mapas, setores, portais e recursos configuráveis pelo Supabase.
- Cache temporário `world.runtime.json` no Render com fallback em disco.
- Shared Universe atualiza recursos e mapas sem reiniciar o servidor.
- Preços de recursos e pools de minério passam a obedecer o World Runtime.
- Rotas e nível mínimo dos setores deixam de depender exclusivamente do código local.
- Topbar V18.1.3 preservada sem alterações.

## V18.1.3 — Topbar Router Hotfix

- Corrige botões da topbar que podiam parar de responder após aplicação/reordenação Data Driven.
- Adiciona roteador único por `module_key` para PILOTO, MISSÕES, BATALHA, CLÃ, MAPA, LEILÃO, LOJAS, ADM e CONF.
- Dropdowns continuam reordenáveis pelo Supabase sem depender de listeners antigos presos à posição original do DOM.
- Mantém whitelist local: nenhuma ação JavaScript é recebida do banco.
- Não altera NPCs, posição, Warfront, economia ou recompensas.

## V18.1.1 — NPCs + Recompensas Data Driven
- HP, escudo, dano, velocidade, CR, STL, XP, recursos e respawn dos NPCs agora vêm do Supabase.
- Quantidade de cada NPC por mapa agora é configuração explícita no banco.
- Servidor mantém fallback local se o banco/configuração estiver indisponível.
- Configuração é cacheada e atualizada em runtime; salas existentes recebem novos valores sem redeploy.
- Reduções de população entram naturalmente nas próximas mortes; aumentos aparecem imediatamente.
- Cliente sincroniza catálogo para nomes e cálculos de missões, mantendo recompensa final autoritativa no servidor.

## V18.1.0 — Data Driven Core • Stage 1

- Feature Flags globais no Supabase.
- Topbar e itens dos dropdowns agora recebem nome, ordem, nível mínimo e ativo/inativo do banco.
- Configuração usa whitelist de módulos; banco nunca injeta HTML/JavaScript.
- Cache local por conta + fallback local: indisponibilidade do Supabase não impede o jogo de abrir.
- Polling leve por versão: alterações no banco chegam sem redeploy (até ~45s, ou no próximo login/F5).
- RPCs administrativas preparadas para a futura Central de Configuração ADM.


## V18.0.3 — Patent Ranking Fix
- Remove a carência de 1 dia para disputar patentes.
- Patentes competitivas liberam no LV2 e seguem a posição por pontos.
- Honra negativa continua sobrepondo a patente; ADM continua fora do ranking público.

## V18.0.3 — Warfront Global Announcements

- Avisos globais em tempo real quando um piloto conquista A/B/C nos mapas 4-1, 4-2 e 4-3.
- Domínio total 3/3 gera anúncio global especial informando qual facção controla o mapa.
- Quebra de domínio total também gera alerta global.
- O piloto que conclui a captura aparece no anúncio; capturas em equipe podem informar quantos pilotos estavam na zona.
- Fila visual evita que captura do terceiro ponto e domínio total se sobreponham.
- Anti-spam no servidor por evento/facção.
- Sem alterações na economia/recompensas da Etapa 1.

## V18.0.0 — Warfront Sector Control • Stage 1

- Battle Maps 4-1, 4-2 e 4-3 agora possuem três pontos de controle sincronizados no Shared Universe.
- Captura territorial é autoritativa no servidor e usa a posição real dos pilotos conectados.
- Um piloto captura um ponto neutro em aproximadamente 18 segundos; até três pilotos da mesma facção aceleram a captura.
- Presença de facções rivais no mesmo ponto congela o progresso como CONTESTADO.
- Pontos inimigos precisam ser neutralizados antes de uma nova facção assumir o controle.
- Cenário e minimapa exibem zonas, dono, contestação e progresso de captura.
- WARFRONT ganhou painel ao vivo com placar Terra / Marte / Júpiter e navegação rápida até cada ponto.
- Esta etapa não concede CR/STL/XP: primeiro validamos a mecânica territorial antes de conectar economia e temporada.
- Bootstrap, posição persistente e regras de Grupo/NPC da V17.9.5 foram preservados.

## V17.9.5 — Battle Group Reward Stability
- Atividade de combate de NPC passa a sobreviver a troca de mapa/conexão por 120s no servidor.
- Grupo atual do primeiro atacante é revalidado na morte do NPC.
- Apenas membros vivos, na mesma instância e ativos nos últimos 120s entram na divisão.
- CR/STL/XP são divididos sem multiplicação.
- Missão/conquista/passe/clã/kill credit pertencem somente ao primeiro atacante elegível.
- Box continua exclusiva do primeiro atacante, mesmo se ele ficar inativo antes da morte.

## 17.9.3 — Global Battle Group Search
- Grupo de Batalha agora busca pilotos globalmente por callsign, sem depender de mapa, facção ou presença online.
- Convites passam a usar o UUID real da conta, evitando falhas por formatação do callsign.

## V17.9.2 — NPC Ownership + Cross-Faction Battle Groups

- Grupo de Batalha aceita pilotos de qualquer facção.
- Membros do mesmo grupo são tratados como aliados para leitura tática/PVP.
- Primeiro ataque efetivo marca o NPC para aquele piloto/grupo.
- NPC marcado aparece com arco colorido para o dono/grupo e branco para terceiros.
- Fora do grupo, terceiros podem ajudar no dano, mas não recebem CR/STL/XP nem box.
- No mesmo setor/instância, CR/STL/XP são divididos igualmente apenas entre membros do grupo ativos.
- Membro ativo = causou dano em algum NPC nos últimos 120 segundos e está vivo no setor.
- Box de carga e drop raro pertencem somente ao primeiro piloto que marcou o NPC.
- Regras de propriedade e divisão são validadas no servidor do Shared Universe.

## V17.9.1 — ADM Analytics + Pilot Titles

- Dashboard ADM com CR/h, STL/h, XP/h, sinks de moeda e atividade em 24h.
- Marcos de nível agora mostram mediana, média e P90 de tempo.
- Jogadores recebem leitura de ritmo NORMAL / RÁPIDO / LENTO conforme telemetria.
- Detalhe individual mostra economia por origem, gastos e marcos de progressão.
- Perfil de Títulos ganhou progresso visual e requisitos quantitativos.
- Mantém as correções críticas de bootstrap/world da V17.7.6.


## V17.9.1 — Bootstrap Recovery + World Restore
- Corrige regressão onde o HUD aparecia com HP 1/1, mapa sem NPCs e sem usuários antes do bootstrap terminar.
- Save + stats + mapa + Shared Universe sobem antes de Premium/LIVE OPS/Designers.
- Serviços secundários agora sincronizam em background e não bloqueiam gameplay.
- Posição autoritativa usa rota same-origin no servidor e timeout de bootstrap.
- Se o checkpoint dedicado chegar atrasado, ele só é aplicado enquanto o jogador ainda não moveu a nave.
- Watchdog de Shared Universe/presença tenta reconectar sem travar o cliente.
- Nenhuma nova remoção SQL nesta versão; a correção é exclusivamente de bootstrap/runtime.
## 17.9.1 — Position Root Fix + SQL Cleanup
- Persistência de posição simplificada: `player_location_v1774` + checkpoint local são as únicas fontes de spawn; `player_presence` deixa de decidir diretamente onde o jogador nasce.
- `player_presence` agora espelha automaticamente a posição real para `player_location_v1774` via trigger no Supabase.
- Posição final é confirmada ao terminar um deslocamento e periodicamente durante movimento.
- Spawn/fallback de base não é promovido para checkpoint definitivo sem checkpoint válido ou movimento real do jogador.
- Respostas da economia preservam mapa/X/Y atuais em vez de substituir localização com snapshot econômico antigo.
- Presença online volta a ser efêmera e é removida no logout/pagehide.
- SQL: removidas 9 tabelas legadas/temporárias que não participavam mais do runtime.
- Pasta `sql/` do release foi reduzida às referências atuais.

## 17.7.1 — Player Telemetry + Titles
- Reset total de conta continua exclusivo do painel ADM; o reset administrativo também limpa a telemetria para iniciar testes de progressão do zero.
- Telemetria registra tempo jogado, sessões, níveis alcançados, kills, boxes, mineração, missões, mortes, saltos e geração/gasto de CR/STL/XP.
- Fontes econômicas separadas em NPC, missões, recursos, passe/nível, eventos, portais, exploração e outros.
- Painel ADM ganhou visão de economia global, CR/h, STL/h, XP/h, tempo médio até níveis-chave e detalhe individual por jogador.
- Sistema de títulos com perfil próprio no Hangar e títulos liberados por nível/conquistas.
- Abaixo do callsign no mapa aparece apenas o título equipado; patente permanece representada pelo emblema e o nível deixa de ser exposto visualmente.
- Título sincronizado no Presence/Shared Universe para outros jogadores.


## 17.7.0 — Progression & Economy Rebalance
- Nova curva de XP com migração que preserva nível/progresso relativo de contas existentes.
- NPCs: XP reduzido, Stellarium reforçado, Créditos preservados.
- Missões deixam de multiplicar recompensas em 10X/7X/5X/3X e viram bônus controlados.
- Desbloqueios: X-2 LV3, Missões LV5, Piloto LV6, X-3/Semanais LV7, Clã LV8, X-4/Mensais LV10, Especiais LV12, Battle Maps LV15.
- Passe e recompensas de nível entregam mais STL.
- Seções do Passe minimizáveis e trilhas FREE/PREMIUM empilhadas verticalmente.

## 17.6.7 — Pilot Accordion + Economy Fast Path
- Cupom Premium: botão RESGATAR padronizado com os botões dourados do jogo.
- Perfil de Piloto: DEFESA, UTILIDADE e ATAQUE viraram accordions persistentes no padrão do Hangar.
- Regra de dependência: pesquisas de 2/3 níveis exigem máximo; pesquisas de 5 níveis liberam a seguinte no nível 3.
- Economia: remove save forçado quando não há alterações pendentes; LIVE OPS usa cache; consultas independentes rodam em paralelo; Premium é consultado apenas quando a ação precisa dele; gravação de save/perfil é paralela.
- /api/economy/action passa a retornar server_ms para diagnóstico de latência.

# 17.6.4 — HUD Dock Slot Lock

- Minimap fixed permanently in the bottom-right HUD slot.
- Hiding Chat no longer causes minimap reflow/overlap.
- When Chat is hidden, Weapons/Ammo expands into the freed left area.
- Explicit dock slot assignments prevent CSS Grid auto-placement from moving HUD panels.

# V17.6.3 — Admin Control Panel

- Nova aba ADM visível apenas para contas presentes em `game_admins`.
- Busca de contas por callsign, e-mail ou UUID.
- Ban temporário ou permanente com motivo e desconexão da sessão ativa.
- Remoção de ban.
- Reset completo de progresso preservando login, callsign e Premium.
- Exclusão definitiva da conta, obrigando novo cadastro.
- Proteção contra ban/reset/delete de contas administrativas pelo painel.
- Log auditável das ações administrativas.
- Ban aplicado também no login, refresh, APIs autenticadas e Shared Universe.
- Migration: `sql/V17_6_3_ADMIN_CONTROL_PANEL.sql`.

## V17.6.1 — ENVIRONMENT ASSET LOADING HOTFIX
- Cache-busting aplicado também aos arquivos de imagem, evitando fundo/base/recurso antigo ou 404 preso no navegador/CDN após deploy.
- Modo BAIXA mantém o fundo do mapa visível com alpha e efeitos reduzidos em vez de desligar o cenário por completo.
- Pré-carga ativa agora inclui fundo atual, base orbital, portal, recursos presentes no mapa e caixa de loot.
- Assets de cenário V17 ficam protegidos do descarte prematuro do cache durante a partida.
- Recursos/minérios migrados para o pipeline V17 em WebP otimizado.
- Portais agora usam sprite visual próprio do cenário, mantendo os anéis/efeitos leves do Canvas por cima.
- Naves, NPCs, AUX-9 e drones permanecem intocados.

## V17.6.0 — MAPS + PORTALS + ENVIRONMENT REVAMP
- Novos fundos V17 otimizados para X-1, X-2, X-3, X-4, 4-1, 4-2, 4-3, AURORA, NEXUS e ECLIPSE.
- Iluminação ambiente própria por setor, adaptada ao modo de qualidade.
- Portais com cores por rota/destino e efeitos reduzidos automaticamente em dispositivos mais fracos.
- Base X-1 refinada e safe-zone visual menos invasiva.
- Recursos e caixas mantêm sprites originais, com iluminação mais leve.
- Naves, NPCs, AUX e drones não foram alterados.

## V17.5.3 — POSITION PERSISTENCE HOTFIX
- Posição da nave agora persiste corretamente ao atualizar/reabrir o jogo.
- Checkpoint por mapa/território evita fallback indevido para a base.
- Compras e mutações econômicas não sobrescrevem mais a prioridade temporal do snapshot de posição.

## V17.5.2 — ENTITY GRAPHICS LOCK + SCENE PERFORMANCE
- Modo AUTO não remove/rebaixa sprites de NAVE, NPC, DRONES ou AUX-9.
- Assets V17 de entidades ficam protegidos contra descarte do cache.
- Mudança de qualidade atua principalmente no cenário, iluminação, fundo e densidade ambiental.
- Pré-carga ativa reforçada para NPCs presentes e jogadores online.
- Corrigido fallback visual que podia permanecer após AUTO baixar/subir a qualidade.

## V17.5.1 — EVENT CLEANUP HOTFIX
- Limpeza automática de NPCs/ores ao fim ou rotação de eventos.
- Prevenção de acúmulo de ondas e respawns atrasados.
- Sincronização imediata no Shared Universe.

## V17.5.0 — NPC + BOSS VISUAL REVAMP
- Sprites NPC/PRIME limpos e centralizados.
- Auras por família, PRIME e EVENTO.
- TARGET LOCK com retrato do alvo.
- Pseudo-3D/banking visual em NPCs.
- Nenhuma regra de gameplay alterada.

## V17.4.0 — PERFORMANCE + MOBILE PASS

- Novo modo AUTO de qualidade com detecção de celular/desktop, memória, threads e economia de dados.
- Perfil AUTO ajusta resolução, FPS, partículas e efeitos durante a sessão conforme desempenho real.
- Assets V17 convertidos de PNG para WebP com transparência, reduzindo drasticamente o peso do pacote e o download inicial.
- Preload inteligente: carrega somente assets essenciais no boot e faz lazy-load de naves, drones e equipamentos quando necessário.
- Cache de imagens agora possui limite e descarte LRU para reduzir consumo de memória em sessões longas.
- Renderização fica suspensa quando a aba está em segundo plano.
- Mobile Pass remove blur/sombras pesadas, compacta modais e melhora toque sem mexer na lógica de combate.
- Respeita a preferência do sistema por redução de movimento.

## V17.3.0 — FX REVAMP
- Lasers agora possuem assinatura visual diferente por munição (PLS-1/2/3/4 e SIP-2).
- PLS-4 recebeu plasma pulsante; SIP-2 recebeu efeito de drenagem energética.
- Mísseis ganharam trilha, glow, núcleo e onda de aproximação.
- Impactos de escudo, regeneração e reparação ganharam efeitos dedicados.
- Explosões ganharam núcleo luminoso e shockwave em camadas.
- Portais ganharam anéis de profundidade para reforçar sensação 3D.
- Efeitos remotos usam a mesma linguagem visual para PvP/Shared Universe.

## V17.2.0 — SPRITE POLISH + COMBAT VISUALS
- Inclui o polimento V17.1: sprites de nave recortados por componente principal, fragmentos vizinhos removidos e margem segura ampliada.
- Quadros do Hangar/Loja ampliados e imagens centralizadas com escala segura.
- Sprites de mapa também receberam padding seguro.
- NPCs/Bosses migrados para pipeline V17 com padding seguro.
- V17.2: pseudo-3D em combate com banking/lean em curvas, thruster wake dinâmico e aura orbital para designers raros.
- Mesmos efeitos aplicados a jogadores online; NPCs recebem micro-depth/pulse visual.

## V17.0.0 — VISUAL REVAMP / DUAL SPRITE PIPELINE

- Novo pacote visual V17 para naves, AUX-9 e drones com sprites 3D-style e acabamento mais premium.
- Separação de sprites para UI/loja/hangar e sprites para mapa/combate, evitando reaproveitamento da mesma arte em perspectivas erradas.
- Novo manifesto de assets em `/public/assets/v17/manifest.js`.
- Atualização do pipeline para usar `shipMap` e `droneMap` nas renderizações do mapa.
- Refresh visual de ícones principais de equipamentos no tema V17.

## V16.7.9 — HANGAR EQUIPMENT COMMAND

Versão anterior mantida no histórico do projeto base.

## Mission + Loot Polish
- Painel de missões agora permite recolher/expandir cada categoria individualmente.
- Estado de categorias recolhidas é salvo localmente para persistir entre aberturas.
- Cargo box de NPC migrou para o pipeline atual de assets e recebe preload prioritário.
- Cargo box não usa mais fallback de quadrado amarelo; fallback temporário agora mantém formato de crate.


## 17.7.2 — Position Persistence + XP HUD
- NÍVEL no HUD agora mostra nível + XP total e tooltip com XP restante para o próximo nível.
- Novo checkpoint global de localização por conta (mapa, território, X/Y e timestamp).
- No login/reload, a localização local mais recente é reconciliada depois do save econômico, sem substituir saldo/inventário.
- Checkpoints por mapa continuam mantidos para retorno entre setores.


## 17.7.3 — Position persistence hard fix
- A última posição deixa de depender somente do save econômico/localStorage.
- `player_presence` passa a servir também como checkpoint persistente de mapa/X/Y.
- Reload/login restaura o checkpoint local e usa a última presença do servidor como fallback.
- A linha de presença não é mais apagada em `pagehide`/logout; ela apenas fica stale e some das consultas online após 9 segundos.
- Entrar em mapa privado/Galaxy Gate também não destrói o último checkpoint público.
- Mantém o HUD NÍVEL + XP e tooltip de XP restante da 17.7.2.


## 17.7.4 — Authoritative Position Hard Fix
- checkpoint dedicado de posição no Supabase, separado do save econômico;
- posição sincronizada aproximadamente a cada 1s enquanto o jogador se move;
- envio final com fetch keepalive em pagehide/beforeunload/aba oculta;
- login escolhe a localização mais recente entre checkpoint dedicado, local e presença;
- reset ADM também limpa o checkpoint dedicado.


## V17.9.1 — Server Health
- Botão SAÚDE DO SERVIDOR no ADM.
- Score automático 0–100 para CR, STL e dispersão de XP/h.
- Leitura de ritmo LV5/LV10 quando houver amostra.


## V17.9.1 — Jornada do Piloto
- Tutorial orgânico em 6 etapas, sem tela obrigatória.
- Tracker no HUD mesmo antes do nível 5.
- Recompensas pequenas e funcionais; título Iniciado Estelar ao concluir.


## V17.9.1 — Achievements + Titles
- 11 conquistas persistentes com barra de progresso.
- Novos títulos vinculados a conquistas.
- Recompensas de identidade em vez de inflação de moeda.


## V17.9.1 — Refinaria & Crafting
- 6 receitas server-authoritative na base X-1.
- Refino de recursos, munição, mísseis e Bônus de Reparo.
- Custos em CR criam novo sink econômico sem apagar valor da mineração.


## V17.9.1 — Economy 2.0
- Serviços voluntários da base criam sinks de CR escaláveis por nível.
- Buffs temporários de arma, escudo, porão e propulsão, até 6h acumuladas.
- Gastos entram automaticamente na telemetria de saúde econômica.


## V17.9.1 — Social + Grupo de Batalha
- Grupos server-side de até 5 pilotos da mesma facção.
- Convites por callsign, líder, remoção, transferência automática de liderança e saída.
- Rally compartilhado visível no minimapa.
- Membros do grupo recebem identificação tática azul/ciano no mapa e minimapa.
- Sem bônus de CR/STL/XP para preservar o balanceamento econômico.


## V18.1.3 — Server Runtime Topbar Cache
- Topbar agora usa snapshot SQL materializado pelo Render em JSON temporário.
- Browser não consulta mais diretamente o RPC da topbar.
- Ordem das abas usa CSS `order`; nenhum nó é reanexado no DOM.
- Handlers originais dos botões permanecem intactos.
- Configuração continua vindo do Supabase e pode mudar sem alterar o código do cliente.


## 18.1.6A — Runtime Monitor
- ADM ganhou monitor somente leitura para TOPBAR, NPCs, WORLD e SYSTEMS.
- Render materializa também `npcs.runtime.json`, mantendo os quatro runtimes no mesmo padrão de snapshot temporário.
- Botão `ATUALIZAR RUNTIME` força apenas a renovação dos snapshots; não edita configuração.
- Nenhum editor de balanceamento foi exposto nesta etapa.

## V18.2.3 — BOX BÔNUS E POEIRA STELLAR

- Novo sprite de BOX BÔNUS no mapa (WEBP otimizado) e ícone de Poeira Stellar.
- Box aleatória (um entre sete prêmios): PLS-1/PLS-2/PLS-3/SIP-2, CR, STL e Poeira Stellar.
- Box em todos os mapas, reposição 40–70 s e persistência no save individual por mapa.
- Coleta manual por proximidade e automática pelo AUX-9 em modo Salvager.
- Materializador aceita STL ou Poeira Stellar; uma Poeira por giro. Todos os protocolos a 100 STL, ou 90 STL com Premium.
- Pagamento validado pelo servidor; save, cupons, Smart Missions e qualidade BAIXA preservados.


## V18.2.13 — Loja Premium ADM staging
Abas de Assinaturas/Pacotes/Passe/Níveis com simulações SQL sem cobranças nem alteração no save. Loja Atual e cupons preservados. SQL V18.3.2 existente reutilizado.

Consulta somente leitura das 12 ofertas para pilotos autenticados via RPC SQL V18.3.3; ADM usa V18.3.2 para simular.

## V19.0.9 — CENTRAL DE BALANCEAMENTO
- Nova aba ADM: naves, lasers, escudos, motores, extras e drones, com busca.
- HP, dano, absorção, regeneração, velocidade, cargo, slots e bônus de mapas gravados no Supabase.
- Catálogo inicial baseado em 43 naves + 36 equipamentos, mantendo os valores anteriores.
- Validação por coluna no banco, RLS, controle de versão e `is_game_admin_v1763`.
- Sincronização online periódica e preservação do HP/escudo relativo.
- Reconciliação de slots que excedam o novo limite, com devolução ao inventário.
- Preços/loja, sprites e habilidades especiais preservados.

## V19.0.11 — Expansão X-5 a X-8 e escudos AEG
- AEG aplica bônus real de regeneração do escudo de acordo com os atributos online.
- Quatro mapas novos e 12 setores por facção; segunda base segura em X-8.
- Rota X-4 / Battle 4-X própria / X-5 até X-8, requisitos de nível e proteção anti-invasão.
- Oito tipos novos de NPCs em 16 configurações de spawn, sprites existentes reutilizados.
- Minérios garantidos pelo fallback local/servidor; publicação dos pools em SQL pendente.
- Workflows existentes e saves preservados.

### V19.0.14 — Minérios básicos, BOX bônus altos e portais X-8
# Stellar Legacy V19.0.14 — Minérios, boxes e portais

- Recursos normais nos mapas: apenas Ferron (Prometium), Cryon (Endurium), Virel (Terbium). Eventos mantêm seus recursos temporários próprios.
- Battle 4-1, 4-2, 4-3: `ore_count=0` online; sem criação involuntária de 72 pedras no carregamento. Os NPCs comuns continuam desligados.
- X-5, X-6, X-7, X-8: 20 BOX BÔNUS por mapa, igual X-1 a X-4, com respawn padrão e salvamento individual.
- ADM: distribuição de BOX BÔNUS inclui X-5 a X-8. O banco foi atualizado para não descartar estes novos campos quando ADM salvar.
- X-8: portal de retorno deslocado para a outra lateral do mapa, afastado da base, com coordenadas idênticas na nave e na validação do servidor.
- Rotas, invasões bloqueadas em territórios estrangeiros e Battle 4-X público (nível 15) preservados.

Instalação: subir o ZIP completo no instalador principal original; SQL de minérios e bônus foi aplicado diretamente no Supabase. Não execute migração duas vezes.


## V20.1.1 — PvP contínuo e cadência responsiva (15/10/2026)

- Corrigido o erro que desativava `player.laserFiring` em toda rejeição da RPC de PvP, até mesmo por cooldown, timeout e desconexão momentânea.
- Mantém o ataque ativado até cancelamento do jogador, ausência permanente do alvo, munição esgotada ou bloqueio real de segurança. Fora do alcance a salva pausa, retornando quando a nave adversária volta a estar ao alcance.
- Até três salvas de laser PvP em trânsito por vez, respeitando a cadência base de 0,42s e o estoque reservado até confirmação do Supabase.
- Tolerância de 8s a falhas transitórias de lista de presenças antes de liberar um alvo PvP travado.
- Supabase: janela mínima de ataques ajustada de 0,35s para 0,16s e restaurador automático de níveis de 15/10 atualizado para **preservar a mudança na virada do dia**.
- Proteções preservadas: PvP apenas 4-X, isolamento por grupo, limite de dano, distância e presença autenticada. Sem mexer em economia, naves, sprites, lojas ou salvamentos.
- Novos testes de erros temporários, concorrência limitada, preservação do lock e integridade da reserva de munições.
