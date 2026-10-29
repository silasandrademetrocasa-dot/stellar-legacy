# V106 — Unified Save Engine + Android + limpeza astral (pacote cumulativo)

**Base exata:** ZIP completo `stellar-legacy-main.zip` de 29/10/2026 (contém V105.1 e HOTFIX 3). **Substitui a aplicação isolada** das V105.1B (notificações Android) e V105.1C (hangar). Não aplicar B/C por cima da V106.

## O que mudou
1. Cliente usa **coordenador único**: só um `PUT /api/save` em trânsito. Alterações novas ficam pendentes e o próximo PUT usa o estado atual, jamais um snapshot previamente enfileirado. Limite de 6 tentativas com backoff para conflitos de revisão, sem desativar verificações.
2. `SAVE_NPC_STALE`, `SAVE_ORE_STALE`, compras, eventos etc. mantêm revisões **exclusivas do SQL**. Em conflitos, reconcilia missões *não pagas* e equipamento somente quando a contagem de itens e a titularidade são compatíveis. Caso contrário exibe erro, bloqueia economia até recuperar o hangar. Não cria equipamento nem restaura saldo local.
3. Antes de `sell_inventory`, `sell_drone`, `sell_cargo`, crafting e outras operações da rota comum `runEconomyAction`, exige que o save pendente receba ACK. Aguarda até 15 s; se a confirmação falhar, **não executa a transação**. Bloqueia alteração de equipamento enquanto uma operação econômica estiver em andamento.
4. Render serializa `PUT /api/save` com ações econômicas **na mesma instância** através do `withPurchaseLock` existente. RPC de recompensas NPC ainda ocorre de forma independente no SQL: os conflitos não estão desligados nem se promete eliminar 100% das rejeições em combate contínuo.
5. Em retorno de operação econômica, preserva missões ativas com avanço não creditado (somente quando seguro), evitando que o retorno do RPC descarte atualização de missão feita enquanto a resposta trafegava.
6. Consolida a V105.1B: notificações Android 00h Brasília das missões e arena, opção de ativar/desativar e teste imediato (exige recompilação APK).
7. Consolida a V105.1C: hangar prioritário com ACK e reconciliação conservadora de loadout CONF1/CONF2.
8. O portal astral nos mapas ggAlpha/ggBeta/ggGamma usa apenas **fenda 2D**; não carrega o antigo sprite volumétrico do centro do mapa. Materializador continua usando sua arte. Não foram encontrados arquivos `.glb`/`.gltf` no ZIP original, logo não há modelo 3D para excluir. Auditoria opcional de dois WebP v38 antigos: `node scripts/v106-auditoria-artes-astral.mjs` (prévia) e `--apply` (remove apenas `beta.webp` e `gamma.webp` se continuarem não referenciados). Nunca remove `alpha.webp` do fallback do HTML, nem artes v53/portais 2D.

## Limitações importantes
- A correção melhora o fluxo client/server, mas **não fornece atomicidade absoluta** para todas as recompensas de missão, pois a recompensa final ainda envolve uma segunda gravação, não uma RPC transacional idempotente de missão. Essa RPC exige futura migração auditada de banco. Sem ela, não seria honesto prometer zero falhas mesmo em duas sessões/dispositivos.
- Uma desinstalação limpa os dados locais do Android. Nenhuma fila local garante recuperação de mudanças não confirmadas após desinstalação; aguardar `ONLINE` / `HANGAR SALVO` antes de instalar.
- Gravações de `player/location` e ações financeiras continuam rotas **especializadas**; “save único” refere-se à fila coordenada dos snapshots de `game_saves`, não à remoção das transações dedicadas do servidor.
- Não há SQL, alteração de tabela, exclusão em produção ou deploy realizado por este pacote.

## Implantação e regressão
1. Aplicar este ZIP sobre a base enviada, preservando a árvore de pastas; não adicionar os ZIPs B e C novamente.
2. `npm run check` e `npm test`; fazer deploy Render e gerar novo APK no GitHub Actions.
3. Conferir a notificação em `CONF → JOGO`, botão de teste.
4. Equipar 10 itens seguidos no X-1, passar por `HANGAR PENDENTE` até `HANGAR SALVO`, fechar/abrir, conferir CONF1/CONF2 e inventário.
5. Repetir com NPCs farmando e completar missão 10/10, aguardar `RECOMPENSA AUTOMÁTICA`; relogar, verificar missão uma só vez e não duplicar pagamento.
6. Tentar vender item equipado durante save pendente; deve aguardar confirmação; simular falha/rede offline e verificar que **nenhum item foi vendido** antes de ACK.
7. Testar farm offline e resgate, leilão, PvP, dois jogadores, portais e Materializador. Medir Save 409/400 e taxas de `SAVE_NPC_STALE`/`SAVE_ORE_STALE` por 30–60 min, sem encerrar o cliente prematuramente.
8. Se surgirem conflitos não reconciliáveis, **não forçar o reset de conta**. Guardar prints, timestamp e logs do Render para corrigir a causa sem retirar validação.

## Teste automático local
- 220 testes (`npm test`), `npm run check` e auditoria de arte; testes de APK real e servidor em produção ainda necessários.
