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


## Hotfix — V18.1.2 Topbar Router
A navegação superior passa por um roteador local baseado em `module_key`. Reordenação e labels continuam Data Driven, mas a execução das ações permanece em whitelist no cliente.
