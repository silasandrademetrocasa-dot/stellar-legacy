# V106.6 • UNIVERSO: distinguir bloqueio de ingresso de queda do servidor

## Diagnóstico em produção (30/10/2026 ~20h)
- Serviço Render `stellar.legacy` ativo e sem reinício; telemetria WebSocket indica autenticações, `world_snapshot`, tráfego NPC e respostas `pong` normais.
- Catálogo do Supabase tem U-1 min 20, U-2 min 21, U-3 min 22, com mapas/portais habilitados.
- Conta principal consultada está no nível 18, sem permissão ADM: seu ingresso U-X é bloqueado pelas regras existentes. A versão anterior da interface mostrava `PvP • ERRO` para qualquer `join_error`, inclusive U-X.
- O APK usa o mesmo domínio HTTPS do Render para as artes locais (via `WebViewAssetLoader.setDomain`); `wss://<host>/ws` continua apontando para o servidor correto. Não há correção de URL necessária.
- **Separadamente:** ocorreram alguns timeouts de SQL em `LIVE OPS` e concessões NPC por volta de 20h04-20h05; recompensas voltaram a ser registradas após esses eventos. Não são evidência de uma indisponibilidade persistente do WebSocket.

## Mudança no cliente
- O chip UNIVERSO agora distingue entrada negada (`U-1 • LV20`) de desconexão (`OFFLINE` / `RECONECTANDO`) e de autenticação (`SESSÃO`).
- A razão exata é mantida no título acessível do indicador. Não modifica requisitos de nível, permissão ADM, rotas, WebSocket, recompensas, saves nem economia.
- O `join_error` já emite toast com o motivo. Não força a nave para outro mapa nem cria acesso indevido.

## Nota de implantação
Cumulativo sobre V106.2; inclui V106.3, V106.4 e V106.5. Os dois SQLs originais de V106.5 continuam separados e **não executados**.
