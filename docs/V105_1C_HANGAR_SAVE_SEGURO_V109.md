# STELLAR LEGACY — V105.1C / V109 · Salvamento de equipamento seguro

Base: `V105.1` + `V105.1B`, release `47.7.60`. ZIP incremental. **Não há SQL nem deploy automático.**

## Falha reproduzida por revisão de código + logs

- Equipar nave, drones e AUX-9 chamava `saveGame()`, que grava **localStorage** e marca `cloudDirty`, mas não solicita imediatamente persistência; o ciclo genérico faz `flushCloudSave()` a cada 7 segundos.
- `PUT /api/save` valida revisões de recompensas do servidor (`SAVE_NPC_STALE`, `SAVE_ORE_STALE`, etc.) antes de aceitar o estado completo. Isso é necessário para evitar moedas/recompensas antigas e fraudulentas.
- Ao receber conflito, `flushCloudSave` baixava `remote.state`, restaurava economia do banco e só fazia merge de missões não recompensadas. Isso podia destruir uma montagem de hangar ainda pendente, mesmo que continuasse correta no `localStorage`.
- No intervalo aproximado 10h10–10h35 de 29/10, a telemetria registrou 25 conflitos `SAVE_NPC_STALE`, um `SAVE_ORE_STALE` e uma consulta cancelada por timeout. Isso é evidência de disputa, não prova isolada de qual alteração específica foi perdida.

## V109: alteração de equipamento com ACK

- Prioriza o envio ao Supabase após equipar/remover itens, trocar nave/CONF, copiar CONF, aplicar preset e gerenciar slots do AUX-9. Debounce ~180 ms em alterações seguidas. Não altera a cadência de 7 s dos saves gerais.
- Guarda uma fotografia local pendente do hangar; outras mudanças ocorridas durante um save não são consideradas confirmadas por um ACK antigo.
- Exibe **HANGAR PENDENTE** até confirmar persistência. Ao receber ACK bem sucedido do `PUT /api/save` da montagem mais recente, mostra **Hangar confirmado no Supabase ✓**.
- Em `SAVE_NPC_STALE` ou outro conflito econômico, relê o save autoritativo e tenta reaplicar **apenas** a disposição de equipamentos, CONF e slots de drones/PET. Moedas, XP, recompensas, revisões e conquistas permanecem do servidor.
- Recuperação é bloqueada se houve mudança de propriedade de nave, drones, propriedade do PET, edição de equipamento por outra sessão, ou divergência na quantidade total de qualquer item. **Não cria nem remove itens.**
- Preserva os escudos das configurações confirmados pelo servidor, para não regenerar vida/escudo pela recuperação.
- Se a reconciliação não é segura, sinaliza **HANGAR NÃO SALVO** e pede ao jogador conferir equipamento antes de fechar o APK, em vez de anunciar sucesso falso.
- Em `visibilitychange` solicita save prioritário quando ainda há equipamento pendente. Fechamento forçado do Android ainda pode interromper uma requisição: aguardar aviso de confirmação.

## Não alterado

RPCs econômicas, anti-cheat, revisões de NPC, loja/leilão, farm offline, missões do HOTFIX3, WebSocket e frequência de saves gerais. Nenhuma instrução para enfraquecer guardas do banco. V105.1B notificações Android preservadas.

## Validação

`npm run check`: 209 JS e 309 caminhos de recursos OK.
`npm test`: 213/213. Novos testes: preservação com NPC reward, rejeição de duplicações, conflito entre dispositivos, alterações de nave/drone, confirmação duplicada e prioridade de save no hangar.

**Não foi possível testar um APK real nem reproduzir de ponta a ponta a concorrência de produção com jogadores ativos.** Fazer teste controlado primeiro.

## Procedimento recomendado

1. Concluir farm offline em andamento antes de instalar, se houver.
2. Aplicar ZIP sobre GitHub atual, preservar pastas, `npm run check && npm test`, deploy Render e gerar APK Android novo.
3. Na base X-1, com farm desligado, alterar um único laser; conferir `HANGAR PENDENTE` e depois `Hangar confirmado no Supabase ✓`. Não instalar outro APK antes disso.
4. Fechar/reabrir APK e conferir mesmo laser no mesmo slot. Repita com shield, drone, CONF1/CONF2.
5. Ligar Autopilot e testar NPCs por pelo menos 15–30 min; mudar um item somente ao voltar à base; confirmar ACK e persistência após relog. Verificar se `SAVE_NPC_STALE` continua protegido, sem perder itens nem duplicar moedas.
6. Se `HANGAR NÃO SALVO` persistir, não desinstalar o APK nem continuar trocando equipamento: recolher logs Render e verificar estado remoto. Não usar SQL direto para forçar um save.

**Limitação conhecida:** a correção depende de que o APK mantenha sua memória/localStorage até uma confirmação. Desinstalar e apagar dados antes do ACK pode perder a edição local. Garantia de exatamente uma vez para toda mudança de equipamento/cliente exigiria endpoint transacional dedicado, com revisão independente do ledger econômico.
