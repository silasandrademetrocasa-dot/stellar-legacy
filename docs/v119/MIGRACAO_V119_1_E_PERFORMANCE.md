# Stellar Legacy — V119.1 • Migração incremental segura e dados mais rápidos

Base: `stellar-legacy-main.zip` enviado em 04/11/2026. **Não zerar, não limpar `game_saves`, não recriar leilões e não restaurar backups sem auditoria.**

## Fonte oficial de dados

O **único estado jogável** de cada piloto continua em `public.game_saves.state`. Os saldos em `profiles` são projeções sincronizadas com ele. As tabelas de NPC, minério, leilão, Farm, etc. continuam **comprovantes/auditoria**, não um segundo inventário. O jogador não pode escolher valor de prêmio, preço nem revisão do servidor.

Esta entrega fortalece o núcleo V119 existente e prepara a migração dos comandos, **mas não declara que todos os RPCs antigos já foram convertidos**. Isso depende de migrações específicas de regras econômicas.

## O que esta versão altera

1. `STELLAR_V119_1_CAPTURA_ADAPTATIVA_PREPARAR.sql`: modifica apenas a função/metadata de auditoria e os intervalos de backups A/B/C. Ainda não liga o trigger.
2. `STELLAR_V119_1_CAPTURA_ATIVAR.sql`: com `game_saves` travado na transação, reconcilia hashes/revisões V119 que ficaram desatualizados e **só depois** ativa o trigger. Não modifica dinheiro, frota, progresso ou missões.
3. `STELLAR_V119_1_CAPTURA_DESATIVAR.sql`: rollback imediato **apenas** do trigger. Não apaga histórico.
4. `STELLAR_V119_1_LOGS_SOMENTE_LEITURA.sql`: view `security_invoker` com logs de NPC, minério, Farm, leilão e revisões. Somente Render/service_role pode ler.
5. `server/index.js`: GET save e epoca de reset requisitados em paralelo; rota de histórico consultável e P95/P99 da leitura e gravação do save.
6. `public/api.js`: um token de revisão anterior não persiste para outra sessão sem revisão oficial.

## Por que a auditoria foi otimizada

O trigger V119 original copiava um JSON inteiro para o checkpoint A e inseria um log resumido **a cada atualização** de NPC. Isso acrescenta escrita, gera competição entre transações e pode aumentar latência.

O trigger adaptativo **incrementa a revisão global em todas as alterações confirmadas**, mas só copia o estado inteiro para A a cada 30 segundos ou em mudanças importantes. B e C recebem as gerações anteriores de A. O log resumido de progresso/combate é emitido até a cada 90 segundos, enquanto os **recibos detalhados do NPC e minério continuam individuais** nas tabelas já existentes. Mudanças relevantes de Hangar, missões concluídas, leilão e operações econômicas registram imediatamente.

**Importante:** `game_saves` é sempre mais atual que os checkpoints A/B/C amostrados. A cópia A pode estar até 30 segundos atrás durante combate, por escolha explícita de desempenho; isso não altera o save oficial. O último hash/revisão de `head` é a referência de integridade.

## Instalação na ordem certa

**Pré-requisitos:** deploy da V119.0 ou superior em ambiente de homologação; nenhum Farm Offline marcado `running`; backup das contas, ledgers de NPC/minério e sessões de Farm; logs de falha do Render disponíveis.

1. SQL `STELLAR_V119_1_CAPTURA_ADAPTATIVA_PREPARAR.sql` (se parte das colunas já existir, `IF NOT EXISTS` torna-o repetível).
2. SQL `STELLAR_V119_1_LOGS_SOMENTE_LEITURA.sql` (view de consulta, sem escrita).
3. ZIP V119.1 no Instalador Universal. **Não configurar `STELLAR_SAVE_V119_MODE=enforce`.** Deixar `observe`.
4. Em banco/conta de **homologação**, executar `STELLAR_V119_1_CAPTURA_ATIVAR.sql` e testar abates, recompensas, Hangar, compra, missão, leilão e Farm da meia-noite. Acompanhar P95/P99, número de registros no journal, hash atual e backup B/C.
5. Em produção, executar a ativação somente após homologar e confirmar ausência de Farm ativo. **A ativação é SQL separado, não roda com o ZIP.** Se a carga aumentar, rodar `STELLAR_V119_1_CAPTURA_DESATIVAR.sql` e preservar os saves.
6. Rodar `STELLAR_V119_1_CONFERIR.sql` e verificar que `head.state_hash=md5(game_saves.state::text)` em todas as contas e que `profiles` se mantém sincronizado.

## Critérios reais de aprovação

- 0 perdas de lasers, drones, AUX ou CONF1/2 após reconexão.
- 0 cobrança duplicada; qualquer lance deve ter recibo único da liquidação.
- NPC e minério não retrocedem após salvar Hangar.
- Farm de 8h atravessando 00h00 resgatado uma única vez.
- Com duas contas, PvP e relés não cruzam inventários/posições.
- P95 do GET/PUT registrado antes e depois; nenhum aumento sustentado acima de 20% com a captura ativa.
- Em carga NPC, quantidade de backups e logs é **muito menor** que número de abates; revisão oficial mantém a totalidade das alterações.

## Estado das migrações

| Sistema | Fonte jogável | Escrita legada autorizada | Migração de comando tipado |
|---|---|---|---|
| Perfil, moedas e inventário | `game_saves` | Sim; V118 transacional no Render | **Parcial** |
| Hangar/CONF/AUX | `game_saves` | PUT com guardas V106/V118 | **Pendente** |
| NPC/minérios | `game_saves` + ledger idempotente | RPC de recompensa | **Pendente** (captura central acompanha, não substitui) |
| Loja e compra/venda | `game_saves` + recibos | Endpoints econômicos existentes | **Parcial** |
| Leilão comum | `game_saves` + `auction_bids` e recibo | RPC atômico V118.2 | **Parcial** |
| Leilão de protocolo AUX | `game_saves` + leilão | RPC legado separado | **Pendente** |
| Missões/Passe/níveis | `game_saves` | Progresso + prêmios em fluxos distintos | **Pendente** |
| Farm Offline | `game_saves` + sessão/relatório | RPC de resgate específico | **Pendente** (não tocar durante Farm) |
| PvP/clã/relés/eventos | `game_saves` + estado compartilhado | RPCs setoriais | **Pendente** |
| Designers | `game_saves` + projeção auxiliar | Rotina de designer | **Pendente** |

**Não habilitar modo `enforce` para os módulos antes de migrar todos os comandos que gravam economia, recompensas e equipamentos.** A V119.1 é a migração de captura, auditoria e desempenho; não é um corte final de autoridade das regras de jogo.
