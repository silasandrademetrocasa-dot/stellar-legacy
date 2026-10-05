# Stellar Legacy V18.1 — Data Driven Core

## Stage 1
A interface principal e Feature Flags agora são lidas do Supabase.

### Tabelas
- `game_runtime_meta_v1810`: versão global automática da configuração.
- `game_ui_modules_v1810`: nome, ordem, nível mínimo, visibilidade e hierarquia do menu.
- `game_feature_flags_v1810`: liga/desliga sistemas e guarda configuração JSON futura.

### Alterações sem deploy
Exemplos:

```sql
-- mover MAPA antes de CLÃ
update public.game_ui_modules_v1810 set sort_order=35 where module_key='map';

-- renomear BATALHA
update public.game_ui_modules_v1810 set label='COMBATE' where module_key='battle_menu';

-- esconder LEILÃO temporariamente
update public.game_ui_modules_v1810 set enabled=false where module_key='auction';

-- mudar HABILIDADES para liberar no LV8
update public.game_ui_modules_v1810 set min_level=8 where module_key='pilot_research';

-- desligar WARFRONT globalmente
update public.game_feature_flags_v1810 set enabled=false where flag_key='warfront';
```

Os triggers incrementam `game_runtime_meta_v1810.version` automaticamente. O cliente consulta periodicamente e aplica a nova configuração sem redeploy. No F5/login a configuração também é recarregada.

### Segurança
O banco não envia seletores, HTML ou JavaScript. O cliente contém uma whitelist fixa de módulos conhecidos e aceita apenas propriedades de configuração. Se Supabase/config falhar, o jogo usa cache local e, em último caso, o menu embarcado no código.

### Próximas etapas
1. Stage 2: NPCs + recompensas.
2. Stage 3: mapas + portais + recursos.
3. Stage 4: missões + economia + crafting.
4. Stage 5: Central ADM visual para edição sem SQL manual.


## Stage 2 — V18.1.1 NPC Runtime
- `game_npc_config_v1811`: stats, economia, recursos, respawn e status dos NPCs.
- `game_map_npc_spawns_v1811`: população exata por mapa.
- `get_npc_runtime_config_v1811()`: snapshot versionado consumido pelo servidor/cliente.
- Alterações no banco não executam código arbitrário: apenas alimentam campos validados do motor.
- O servidor continua autoritativo para dano e recompensa.


## Hotfix — V18.1.3 Topbar Router
A navegação superior passa por um roteador local baseado em `module_key`. Reordenação e labels continuam Data Driven, mas a execução das ações permanece em whitelist no cliente.


## V18.1.3 — Server Runtime Topbar Cache
- Topbar agora usa snapshot SQL materializado pelo Render em JSON temporário.
- Browser não consulta mais diretamente o RPC da topbar.
- Ordem das abas usa CSS `order`; nenhum nó é reanexado no DOM.
- Handlers originais dos botões permanecem intactos.
- Configuração continua vindo do Supabase e pode mudar sem alterar o código do cliente.


## V18.1.4 — World Runtime

Fluxo: `Supabase -> Render -> world.runtime.json -> cliente/Shared Universe`.

Tabelas principais:
- `game_resource_config_v1814`
- `game_map_config_v1814`
- `game_map_resource_pool_v1814`
- `game_sector_nodes_v1814`
- `game_portal_links_v1814`

O Git continua responsável pelo motor e pelos assets. O banco controla conteúdo, quantidade, rotas e balanceamento sem executar JavaScript arbitrário.

## V18.1.5 — Missions + Economy + Crafting Runtime

O Runtime de sistemas usa `Supabase -> Render -> systems.runtime.json -> cliente/servidor`.

Agora são configuráveis sem redeploy:
- níveis e multiplicadores das categorias de missão;
- metas/steps e pools de minério dos geradores de missão;
- chance de bônus das missões;
- missões customizadas via banco;
- custos, duração, escala e efeito dos serviços econômicos da base;
- receitas de crafting, ingredientes, custo/moeda, nível mínimo e saída.

O código mantém fallback local para continuidade do jogo se o runtime remoto estiver temporariamente indisponível.



## V18.1.6A — Runtime Monitor
- Etapa somente leitura no ADM.
- Exibe status e versão de `topbar.runtime.json`, `npcs.runtime.json`, `world.runtime.json` e `systems.runtime.json`.
- `ATUALIZAR RUNTIME` apenas força a renovação dos snapshots no Render; não altera tabelas nem balanceamento.
- Nenhum editor foi liberado nesta etapa.


## V18.1.6B — Editor de Interface
O ADM edita `game_ui_modules_v1810` via backend autenticado. Cada SAVE força a regeneração de `topbar.runtime.json` no Render. O editor não escreve HTML/JS e só aceita `module_key` presente na whitelist do servidor.

## V18.1.6C — Editor de NPCs
O ADM passa a editar `game_npc_config_v1811` e os vínculos existentes em `game_map_npc_spawns_v1811`. Cada SAVE força `npcs.runtime.json`. A etapa mantém Mundo e Sistemas somente leitura. O RPC de NPC foi endurecido para preservar campos opcionais enviados como `NULL`.


## V18.1.6D — Editor de Mundo

O ADM ganhou a aba **MUNDO**, com quatro visões: Mapas, Recursos, Setores e Portais. O editor também permite ajustar o peso/ativação dos recursos já vinculados a cada mapa. As alterações são persistidas pelas RPCs administrativas e o Render regenera imediatamente `world.runtime.json`.


## V18.1.6E — Editor de Sistemas

A quinta etapa da Central ADM expõe somente o `systems.runtime.json` para edição controlada. O administrador pode ajustar categorias/geradores de missão, serviços econômicos e receitas de crafting. O backend valida IDs, limites numéricos e objetos JSON, chama apenas RPCs conhecidas e regenera o snapshot temporário do Render.
