# Stellar Legacy Mobile — V146.0 / 47.8.0

Atualização cumulativa sobre V144.1 (47.7.80), V145.0 (47.7.81) ou V145.1 (47.7.82). As artes, preços e regras de balanceamento foram preservados. **É uma etapa testável da migração, ainda não o encerramento das nove fases. Não houve deploy nem aplicação do SQL V146 em produção.**

## O que muda para o jogador

- Compras de catálogo e de suprimentos passam a atualizar saldo disponível e estoque local depois da gravação persistente no dispositivo, sem esperar Render/Supabase. A mensagem identifica a confirmação pendente.
- AUTO BUY e venda de porão/inventário usam a mesma fila quando seus requisitos locais estão satisfeitos. O Autopilot recebe o resultado local desses caminhos sem aguardar a rede. AUTO BUY antecipa o envio em segundo plano.
- A BOX/loot desaparece imediatamente do cenário e não volta a ser selecionada enquanto sua coleta está pendente. O valor aleatório da recompensa entra somente após a confirmação econômica; não foi inventado um prêmio local definitivo.
- IDs únicos, sequência por dispositivo, lotes de até 40 eventos, janela de quatro segundos, backoff e fila IndexedDB persistente. Uma resposta perdida não remove o evento. A confirmação individual deixa de bloquear o clique.
- Saldos/itens provisórios não seguem em checkpoints comuns enquanto houver projeções financeiras pendentes. O mesmo save e a mesma base IndexedDB continuam sendo usados; não foi criado outro banco de saldos.
- CONF1/CONF2, atalhos, montagens e seleções locais continuam com o journal existente. A reconciliação de compras conserva o consumo de munição e os desejos de hangar/missões. Uma compra de equipamento recusada remove a parte provisória correspondente, mantendo montagens legítimas quando a reconciliação de conservação é válida.
- Nave, drone, AUX e formação recém-comprados podem aparecer como adquiridos localmente, mas a ativação da nova posse/efeito autoritativo aguarda a confirmação. Equipamentos já possuídos continuam editáveis pelas regras anteriores.

## Instalação

1. Faça backup do repositório e do banco. Valide primeiro num ambiente de teste compatível com o schema existente. Nunca execute arquivos de `tests/fixtures` no Supabase real.
2. **Quem já está na V144.1/V145/V145.1 usa somente `Stellar_Legacy_V146_0_CUMULATIVA.zip` no Instalador Universal existente.** O patch inclui as alterações V145.0, V145.1 e o pacote SQL V145.2 do evento PvP. Não precisa reenviar as artes.
3. Para uma cópia completa do código e artes, extraia `Stellar_Legacy_V146_0_COMPLETO_PARTE_01.zip` até a última parte na mesma pasta, em ordem. São ZIPs independentes, com arquivos diferentes; não concatene os binários. A árvore resultante é `stellar-legacy-main/`. As partes completas são para reconstruir a árvore; **não passe as partes com workflows/instalador protegido ao Instalador Universal**. No repositório já existente, use o patch pequeno do item anterior.
4. No ambiente de teste: `npm ci`, `npm run verify`, `npm run apk:check`. O último comando verifica e prepara assets; não compila nem instala o APK.
5. Execute `bash scripts/migrate-v146.sh preflight`, depois `bash scripts/migrate-v146.sh apply` com `DATABASE_URL` do ambiente escolhido. O script não instala Supabase CLI, não lê a URL do frontend e não contém credenciais.
6. Publique servidor + cliente V146 juntos, somente após autorização de implantação. O Render mantém `npm install && npm run verify`, `node server/index.js` e o health check existentes. Não muda plano, worker ou variáveis. O servidor precisa da service role já usada no projeto; jamais a coloque no APK.
7. Gere o novo APK com o workflow existente e a mesma assinatura. Atualize sem limpar os dados do aplicativo. Teste compras, coletas, reabertura, duas sessões e retomada do farm antes de liberar a todos.

O login negocia o protocolo com `stellar_localfirst_read_v146`. Sem o SQL, o servidor usa a leitura antiga e o cliente mantém o caminho autoritativo V145.1: **instalar só o ZIP não ativa a nova fila econômica**. O SQL V145.1 e a correção V145.2 já haviam sido aplicados na etapa anterior; isso não significa que o SQL V146 esteja aplicado.

## Rollback sem apagar progresso

`bash scripts/migrate-v146.sh rollback` desliga novas operações otimistas na negociação do próximo login e mantém `drain=true`. Cliente/servidor V146 continuam capazes de enviar as filas já persistidas. Recibos, cursores, saves e A/B/C não são apagados; o núcleo `stellar_player_commit` não é substituído.

Mantenha a V146 instalada enquanto houver filas pendentes, inclusive nos aparelhos que estão offline. O rollback não força logout em sessões que já negociaram a versão. Não volte o APK para a V145 nem limpe IndexedDB antes de escoar as filas: o código antigo não conhece esses eventos. Reaplicar `apply` reativa o protocolo sem excluir recibos. A reversão de código exige cópia do repositório anterior e verificação de todas as filas; em incidente, priorize desativar novas operações e corrigir adiante.

## Limites e pendências

- Missões, passe/eventos, craft/refinaria/protocolos, World Boss/portais, prêmios de Arena e start/resgate de farm offline **não foram todos convertidos para esta nova fila**. Seus validadores e consumidores antigos continuam necessários. A V145.2 do evento PvP foi preservada; não se declara um novo teste multiplayer em produção.
- Farm offline mantém tempo e liquidação do servidor. Não foi liberado cálculo econômico definitivo pelo relógio do Android. A sessão de farm continua exclusiva e bloqueia mutações econômicas concorrentes conforme as guardas existentes.
- O combate/mundo compartilhado ainda usa WebSocket e autoridade do servidor. Esta versão não transforma PvP/NPCs compartilhados num mundo inteiramente offline. Compras feitas durante desconexão são provisórias e podem ser recusadas por saldo/preço/posse/regras ao reconectar.
- Compra de nave/drone/AUX com montagem pendente e vendas com mineração/montagem não confirmada podem manter o preflight anterior. Não foi removida uma dependência sem uma substituição verificada.
- Coleta exige observação assinada da posição pelo servidor. Isso é uma mensagem WebSocket leve, sem SQL. Loot vencido e comprovante com mais de 24 horas podem ser recusados; a fila não cria direito a um drop expirado.
- Ainda há validação econômica e commits por evento dentro do lote. A redução de HTTP e de espera da interface **não comprova redução equivalente de consultas/carga SQL**. Há trabalho pendente para consolidar também o processamento interno do lote e migrar os demais módulos.
- Leilões, transferências, disputas PvP, premium e prêmios competitivos mantêm confirmação autoritativa. Não houve remoção de tabelas, funções de produção, serviços ou rotas ainda consumidas.
- Armazenamento cheio/bloqueado pode impedir a ação local; não se anuncia como salva uma operação cuja transação local falhou. Não desinstale/limpe dados com fila pendente. Não há solução universal para apagamento voluntário dos dados do dispositivo antes do envio.
- Faltam ensaios no APK/Android modesto, rede móvel real, FPS/bateria, navegador completo, reabertura física do processo e carga real Render/Supabase. A entrega é código-fonte e SQL testados em ambiente simulado, não um APK homologado.

Consulte `ARQUITETURA.md`, `ROTAS.md`, `TESTES.md` e `PERFORMANCE.json`. Os relatórios V145/V145.1 permanecem como histórico; a descrição desta V146 prevalece para os caminhos agora migrados.
