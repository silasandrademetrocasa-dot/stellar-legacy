# AUDIT V17.5.1 — EVENT CLEANUP HOTFIX

## Correções
- NPCs e recursos de evento são removidos imediatamente quando o evento termina ou rotaciona.
- Novo evento `event_cleanup` remove entidades antigas em tempo real no cliente.
- Filas de respawn de NPC/ore de evento são descartadas no encerramento.
- Eventos concluídos também limpam as entidades residuais após distribuir créditos/recompensas.
- Spawn de ondas agora tem limite máximo de NPCs simultâneos.
- Eventos de escolta não acumulam ondas indefinidamente.
- Snapshot de segurança ressincroniza o mapa após limpeza.

Nenhuma mudança em economia, dano ou drops.
