# STELLAR LEGACY — V116.1 | Recuperação de Autopilot e venda na base

**Base:** V115.0 cumulativa (package.json 47.7.60). **Instalação:** ZIP incremental pelo Instalador Universal. **Sem SQL.** Não repetir migrações anteriores.

## Diagnóstico da madrugada
- Não existe associação direta entre oito falhas de venda e a interrupção automática: o limite de oito verificações era da busca de rota de portais.
- O bot podia ficar aguardando indefinidamente por uma compra presencial sem resposta; vendas também exigiam CPU remoto mesmo na base e a lógica podia impedir retorno ao mapa de Farm.
- A atualização do botão de venda era condicionada ao HUD completo, causando atraso nas mudanças de área.
- O sistema de recompensas do grupo podia consultar `c.player.userId` após a desconexão do cliente, gerando erro `Cannot read properties of null (reading 'userId')`.

## Correções cumulativas
1. Venda automática de recursos **vendáveis** na base X-1/X-8 da própria facção, sem CPU remoto. Fora da base continua exigindo Terminal Mercante Remoto Elite equipado. Nenhuma nova recompensa é criada pelo cliente.
2. Compra e venda assíncronas no posto recebem janela de confirmação de 30 segundos. Uma transação não confirmada não é repetida automaticamente. Se houver munição utilizável, a nave tenta seguir ao mapa de origem; se não houver, aguarda confirmação e informa o motivo.
3. A busca de rota mantém a sessão viva após 8 falhas, com backoff até 60 segundos; o watchdog limpa a tentativa pendente e recalcula após 120 segundos sem progresso no deslocamento, sem teleporte.
4. Botão `VENDER NA BASE` reage ao mesmo ciclo leve da posição, sem esperar HUD completo, e desaparece ao deixar a área. O modal presencial fecha quando a nave sai da base, salvo se o Terminal remoto estiver equipado.
5. Captura o `userId` do destinatário antes de operações assíncronas de recompensa NPC em grupo. Mantém SQL idempotente, save guard e a autorização de recompensas no servidor.
6. Diagnóstico do Autopilot: `route_unavailable`, `route_watchdog`, `trade_timeout`, `trade_uncertain`, `stopped` por endpoint autenticado e com limitação de frequência. Logs aparecem no serviço Render, sem registrar token/saldo/documentos.
7. Permite duração configurada até 720 minutos (12 horas). O Farm Offline não foi alterado.

## Teste recomendado pós-deploy
- No X-3 com Autopilot configurado para X-3, selecionar `Venda automática`, deixar o porão chegar a 85%, **sem** Terminal Mercante remoto: confirmar rota X-1, aparição do botão ao entrar na base, venda *uma só vez*, desaparecimento do botão ao sair e retorno X-3.
- Com CPU remoto equipado: confirmar venda no X-3 sem retornar à base, sem pausa de movimento.
- Com compra lenta: conferir no painel o motivo `Compra presencial ...` e ausência de novas compras idênticas enquanto a primeira estiver pendente. Se passar 30 s sem confirmação e houver munição, deve tentar voltar ao mapa. Caso não haja munição, deve aguardar de modo seguro.
- Testar duas contas em grupo por 30 min; examinar logs `[autopilot-v116]` e `[npc-reward]`, abates distintos e estabilidade. Só então executar 2h e 8h em dispositivos independentes.

## Segurança, limitações e rollback
- Versão testada com 414/414 testes automatizados e auditoria dos módulos; não é garantia de 100% de estabilidade real, especialmente no Android.
- O bug `SAVE_NPC_STALE` indica que o servidor protege contra um save antigo sobrepor recompensas mais novas: esta atualização **não remove** essa proteção nem garante resolver todos os conflitos. Investigar separadamente se persistirem.
- Movimentação/controle do Autopilot depende de aba ativa e sessão WebSocket. Em Android, uso em segundo plano pode suspender timers.
- Se necessário, restaurar os arquivos equivalentes do pacote V115.0 usando uma cópia/snapshot do repositório. Não realizar rollback SQL.
