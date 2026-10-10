# SMART MISSIONS V18.2.2 — Manual

## Instalação
1. Suba este ZIP completo pelo instalador automático do Stellar Legacy no GitHub (um único ZIP de versão na raiz do repositório).
2. Aguarde o deploy do Render concluir. Não há SQL obrigatório nesta versão.
3. Recarregue a página do jogo. A V18.2.2 mantém os cupons SQL-FIRST já instalados no Supabase.

## Regras
- Jornada do Piloto não concluída: permanece no topo, podendo ser recolhida; jornada concluída: vai para o fim da tela e inicia recolhida (clique para ver novamente os 6 passos).
- Mapas liberados: X-1 nível 1, X-2 nível 3, X-3 nível 7, X-4 nível 10, Battle Maps nível 15. Se o ADM alterar o nível mínimo nos mapas, o catálogo acompanhará a configuração publicada.
- Diárias do nível 5 em diante: caçada, mineração e operação combinada; apenas NPCs comuns habilitados nos mapas liberados, com quantidade ajustada pela resistência HP+escudo.
- Diárias não exigem BOSS; semanais/mensais/especiais podem incluir BOSS se o mapa for acessível. Contratos futuros não são exibidos no catálogo aceito, e os cards informam quantos estão bloqueados.
- Troca gratuita voluntária: 1 vez por dia, substitui a missão diária ativa por uma das outras duas opções pendentes; reseta progresso da missão trocada. NÃO reativa contrato já concluído.
- Missões ativas mantêm os alvos ao subir de nível, com snapshot salvo na conta. Objetivos diários antigos impossíveis são corrigidos automaticamente com preservação apenas de progresso compatível.

## Configuração no Supabase existente (sem novo esquema)
O próprio ADM já edita a categoria daily em game_mission_category_v1815. Os novos campos opcionais do objeto JSON `config` são:
- `smart_hunt_target`: meta-base da caçada diária;
- `smart_ore_target`: meta-base da mineração;
- `smart_combo_target`: meta-base da operação combinada.
Os números são limitados pela faixa de nível e pelo HP+escudo do NPC para impedir metas inviáveis; se ausentes, usam padrões por faixa.
Para garantir atualização imediata no jogo, use o editor de MISSÕES do ADM (que publica a versão do runtime); edições SQL diretas na tabela podem depender de atualização do runtime.

Faixas-base: 5-6 = 12 NPC / 65 minérios; 7-9 = 20 NPC / 100 minérios; 10-14 = 28 NPC / 150 minérios; 15+ = 40 NPC / 200 minérios. Os alvos resistentes exigem menos eliminações de acordo com seu HP+escudo.

## Verificação
Execute `node test_smart_missions.mjs` no projeto de desenvolvimento para testar elegibilidade de níveis 5/6/7/9/10/14/15/25/44, filtros de NPC SQL e migração de missões. O teste é opcional para deploy e não depende do banco de produção.
