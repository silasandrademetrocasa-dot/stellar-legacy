# HOTFIX V104-MISSIONFIX1 — Aceitação e progresso de missões com Autopilot

**Base exigida:** Stellar Legacy V104 (package.json 47.7.60).
**Formato:** pacote incremental, sem assets pesados. **Não contém SQL nem altera dados no banco.**

## Sintoma investigado
Missões precisam ser aceitas repetidamente ou perdem progresso quando o Autopilot está caçando e o save online reconcilia recompensas de NPC/ore.

## Causa técnica identificada em análise estática
- Um PUT de `/api/save` recebe uma fotografia do estado; enquanto ele trafega, o Autopilot pode registrar novos abates ou uma missão pode ser aceita.
- Na V104, o fim do PUT executava `cloudDirty=false` incondicionalmente, podendo esconder mudanças posteriores.
- Se o Supabase devolve `SAVE_NPC_STALE`, `SAVE_ORE_STALE` ou outros códigos de revisão, o cliente substitui o save por aquele do servidor. Isso pode remover a aceitação/progresso local ainda não sincronizado.
- O reparo diário podia substituir um contrato já aceito quando uma configuração de NPC/mapa mudava e ele deixava de ser considerado elegível.

## Alterações
1. Fotografia imutável (`structuredClone`) e geração de alterações para não perder a indicação de save pendente.
2. Aceitar/abandonar/trocar/concluir missão solicita sincronização antecipada, além do autosave periódico.
3. Após reconciliação com o servidor, somente **aceites ainda ativos e progresso parcial não recompensado** podem ser restaurados. A conclusão e os saldos do servidor prevalecem; não restaura recompensas já pagas nem gera moedas.
4. Uma missão diária aceita mantém a definição até encerrar o período; troca de nível/snapshot não causa reroll invisível.
5. Cache-bust no carregamento do JS para clientes web.

## Limites e segurança
- Este hotfix não adiciona recompensas e não faz mutações no Supabase.
- Não recupera automaticamente pagamento de missão finalizada que nunca tenha sido registrado no banco. Esse cenário requer auditoria específica para uma futura RPC transacional/idempotente de recompensas.
- Abates em grupo/servidor ainda seguem a regra de propriedade do alvo: quando o jogador não é o dono da marcação, ganhos econômicos divididos não necessariamente contam como objetivo de missão.
- A hipótese de corrida de save foi confirmada na leitura do código; ela **não foi reproduzida em produção de forma isolada**, e os ganhos reais da correção precisam de testes no Android.
- **Não implante durante o teste de tráfego de 21h–2h:** espere terminar e capture as métricas da V104. No GitHub, copie os caminhos contidos no ZIP por cima dos existentes e faça deploy/recompile o APK depois.

## Arquivos alterados
- `public/game.js`
- `public/index.html`
- `public/modules/mission-save-recovery-v105.js` (novo)
- `tests/v105-mission-save-recovery.test.mjs` (novo)
- `docs/V104_MISSIONFIX1_AUTOPILOT.md` (este documento)

## Validação local
- `npm test`: **189/189 aprovados** (184 existentes + 5 novos).
- `npm run check`: **199 JS verificados**, 309 assets verificados, HTML/imports/servidor válidos.

## Teste após implantação
- Autopilot ligado, aceitar uma missão e observar que ela continua ativa sem precisar clicar várias vezes.
- Matar NPCs marcados pelo próprio jogador, observar incremento 1 a 1.
- Completar contrato, relogar, conferir contagem/recompensa uma única vez e verificar save online.
- Testar junto a outro jogador que dá o último tiro para distinguir regra de propriedade do alvo de bug de save.
- Registrar prints, hora e categoria se ainda ocorrer perda de progresso; capturar erros `/api/save` (HTTP 409) para investigação.
