# Stellar Legacy — Instalação do pacote V22.0.0

**Estado SQL:** executado diretamente no Supabase do projeto `stellar-legacy`. Migrações registradas `stellar_v22_0_0_competitive_elite_world` e `stellar_v22_0_1_elite_title_selection`. Não rode novamente se este for o mesmo banco.

## Publicar
1. Garanta que a variável privada SUPABASE_SERVICE_ROLE_KEY continue configurada no Render.
2. Suba este ZIP na raiz do repositório, sem extrair; deixe apenas um ZIP stellar-legacy*.zip na raiz.
3. GitHub → Actions → Instalar versão do Stellar Legacy → Run workflow.
4. Aguarde o deploy concluir. Confirme `/health` retornando 22.0.0.
5. Faça login numa conta comum e numa conta ADM. Abra MISSÕES → Centro de Comando → TEMPORADA.

## Roteiro para testar antes de liberar a competição
- [ ] Guerra PvP: relés A/B/C mantêm proprietários ao atualizar a página.
- [ ] PvE X-1/X-8: câmera centralizada, portais funcionais e CONF 1/2 equilibradas.
- [ ] ADM: criar temporada em rascunho para data FUTURA, salvar, editar e só então publicar quando decidir.
- [ ] Sem temporada ativa, o jogador vê informação neutra (nenhuma pontuação/recompensa inventada).
- [ ] ADM: criar um aviso INATIVO, com mapa e período; verificar visibilidade quando ativado.
- [ ] Elite: resgatar uma conquista válida, equipar título, atualizar e testar se ele permanece, retornar ao título comum.
- [ ] Com uma temporada ativa, capturar ou defender um relé e conferir o ranking de piloto/facção/clã.
- [ ] Finalizada a temporada, verificar prêmio elegível e impossibilidade de resgatar duas vezes.

**Resgates de prêmio:** nunca devem ser testados em jogadores reais antes de revisar valores da competição. O SQL não insere temporada automaticamente. Eventos de mundo nesta versão são avisos, NÃO spawns automáticos.

## Rollback
Reinstalar o ZIP V21.5.4 reverte o frontend/servidor, mas **não desfaz migrações de dados**. As novas tabelas são aditivas e não interferem no funcionamento antigo. Nunca faça DROP manual das tabelas de Elite, Guerra ou saves.
