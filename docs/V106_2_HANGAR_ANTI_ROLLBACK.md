# Stellar Legacy — V106.2 | Hangar Anti-Rollback

**Base obrigatória:** V106.1 (save de munição) já aplicada.
**Entrega:** ZIP incremental. **Não requer SQL novo nem altera a conta de nenhum piloto.**

## Evidência investigada

Na sessão 30/10/2026 houve uma regressão de CONF1 entre ~00h34 e ~01h01 BRT: de 14 lasers/7 extras para 10 lasers/5 extras; os extras e lasers sobrantes reapareceram no inventário. O farm offline foi liquidado às 23h32, mas não houve novo resgate de farm durante a regressão mais recente. Portanto, **não é correto atribuir a causa direta exclusivamente ao SQL do farm**.

Causa técnica: `saveGame()` chama `saveActiveBattleConfigV2013()` em todas as gravações, inclusive as geradas por combate, missão ou posição. Um estado de equipamento obsoleto carregado por reconciliação, boot, RPC econômica ou resgate pode assim sobrescrever silenciosamente a CONF ativa. O `PUT /api/save` anterior validava economia e revisões, mas não exigia que uma redistribuição de equipamento tivesse sido iniciada por uma ação de hangar. O simples timestamp local mais recente no bootstrap podia ainda sinalizar uma divergência de equipamento como 'pendência de hangar' sem nenhuma ação explícita.

## Mudanças

1. **Servidor — validação de intenção:** todo `PUT /api/save` compara o layout de nave, CONF1, CONF2, drones e AUX com o layout autoritativo. Se mudou, só aceita um `equipmentMutationV1062` associado a uma ação explícita de equipamento e a um baseline que corresponda ao layout corrente. Na ausência dessa intenção, HTTP 409 `SAVE_EQUIPMENT_INTENT_REQUIRED`; se o layout do servidor mudou desde o baseline, HTTP 409 `SAVE_EQUIPMENT_STALE`. Revisões NPC/ORE, controle SQL, moeda, prêmio e antifraude existentes continuam valendo.
2. **Cliente — bloqueio pré-envio:** uma gravação genérica que detecta diferença não declarada no hangar deixa de enviar o snapshot; recarrega a montagem oficial do servidor, mantendo as missões não recompensadas e a munição ainda pendente.
3. **Cliente — journal leve:** uma edição legítima de equipamento fica registrada no armazenamento local até seu ACK. Após reiniciar o APK, um timestamp recente de combate não é mais interpretado como intenção de alterar equipamento. O journal é restrito ao usuário logado e ao layout explicitamente modificado.
4. **Farm offline:** aguarda o fim de saves em voo antes da etapa de recuperação pós-resgate, para não receber tardiamente um PUT antigo. Nenhuma alteração na liquidação SQL e nenhum desbloqueio indevido durante farm.
5. **Observabilidade:** o Render registra `[HANGAR_WRITE_GUARD_V1062]` quando recusar um layout incorreto. Não grava moedas nem dados privados de jogadores nos logs.

## Limites importantes

- Essa correção **previne novos sobrescritos automáticos** e não recupera montagens antigas já confirmadas como desmontadas no banco. Os itens que voltaram ao inventário devem ser reequipados uma vez após a atualização, em área segura. NÃO restaurar uma cópia antiga do banco, porque isso poderia reverter moedas, missões e farm.
- Uma sessão válida do jogador continua podendo intencionalmente mudar a CONF ou remover um item por comando do hangar. Os guardas existentes de propriedade, quantidade de itens, vendas e moeda continuam em vigor.
- Como o servidor passa a exigir intenção nas alterações de montagem, **APK e Render precisam receber a V106.2**; clientes antigos poderão ter suas edições de hangar recusadas até atualizar. Testar uma conta por vez.
- Testes automatizados são simulações locais e não provam ausência absoluta de corridas com recompensas NPC nem substituem regressão física Android + servidor real.

## Validação manual

1. Instale pacote em GitHub, aguarde Render Live com V106.2, gere e instale APK V106.2.
2. Na base X-1, reequiper CONF1 e CONF2 deliberadamente, conferir notificação **Hangar confirmado no Supabase** e fechar/reabrir APK.
3. Manter autopilot e missões + alterações de munição por 20–30 min; checar que extras e lasers continuam presentes após conflito `SAVE_NPC_STALE`.
4. Fazer uma venda de porão (não de equipamentos), comprar munições, reiniciar o APK e observar as duas CONFs.
5. Iniciar farm offline, resgatar, validar saldos + CONF1/CONF2, fechar/reabrir APK. Verificar que a seleção de munição e os equipamentos não regrediram.
6. Monitorar logs Render `[HANGAR_WRITE_GUARD_V1062]`, Supabase `SAVE_NPC_STALE`, `SAVE_EQUIPMENT_*`, e comparar inventário + ambas as CONFs antes/depois. O registro `SAVE_NPC_STALE` ainda pode ocorrer quando há recompensa em paralelo; o indicador essencial é não perder alterações.
