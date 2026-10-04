# AUDIT V17.5.3 — POSITION PERSISTENCE HOTFIX

- Corrige retorno indevido da nave para a base após reload/atualização.
- Adiciona checkpoint local independente por mapa + território, atualizado durante o movimento.
- Na inicialização, usa a coordenada mais recente entre save, checkpoint e legado.
- Salva a posição do mapa de origem antes de qualquer troca de mapa.
- Corrige timestamps de mutações econômicas no servidor para que compras não façam um save remoto antigo parecer mais novo que a posição local.
- Mantém respawn na base apenas para situações intencionais (morte/reparo/fluxos que já exigiam base).
