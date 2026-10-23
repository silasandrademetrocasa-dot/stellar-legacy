# Auditoria de farm • The Devil of Dead • 22/10/2026

Este release **não altera saldos, total de NPCs, saves ou histórico** para tentar resolver diferenças contábeis sem evidência.

## Retrato obtido antes do deploy
- Conta começou farm às 20:40 BRT e último save às 21:41 BRT.
- Registro de NPC por kill_key: 430 pagamentos únicos totais / **412 pagamentos entre 20:40 e 21:40**.
- Telemetria agregada: 430 kills, 107.600 XP originados por NPC, 445 BOX, 9.976 unidades de recursos, 3.450 segundos ativos.
- Save de piloto: `aliensKilled=213`, `profile.xp=53680`, nível 2, `titles.stats.boxes=237`, `titles.stats.oreUnits=5276`.
- Origem da diferença AINDA NÃO provada. Pode ser lógica de duas fontes/atualização/gravador; comparar eventos com estado antes de cogitar mudanças de economia.
- Registro de 430 kill_keys distintos; não atribuir duplicação apenas por reenvio de chave idêntica.

## Verificações sugeridas após deploy
1. Registrar horário e perfil completo de dois pontos de coleta com 10 minutos de intervalo.
2. Comparar os deltas de `profile.xp`, `profile.aliensKilled`, `serverNpcRewardRevision` contra os deltas de `player_telemetry_v1771` e `stellar_npc_reward_ledger`.
3. Contabilizar recompensas partilhadas e eventos, distinguindo `serverNpcRewardRevision` de `aliensKilled` local.
4. Não inferir XP/h a partir de XP acumulado após migração, porque os valores absolutos foram reescalados. Usar delta por sessão já migrada.
5. Validar que `xpModelV482=true` só é criado depois de conversão, e que login, refresh e troca de configuração não redefinem XP.

## SQL somente leitura
```sql
SELECT p.callsign,p.level,p.xp,p.credits,p.uridium,p.aliens_killed,
       s.state->'profile'->>'xpModelV482' AS converted,
       s.state->>'serverNpcRewardRevision' AS npc_revision,
       s.updated_at
FROM public.profiles p JOIN public.game_saves s ON s.user_id=p.id
WHERE p.callsign ILIKE '%Devil%';
```

Se os deltas divergem novamente em uma sessão de medição sincronizada, investigar o código dos recibos multiplayer antes de alterar a remuneração.
