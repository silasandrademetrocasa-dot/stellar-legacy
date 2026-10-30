# STELLAR LEGACY V106.5 — Venda automática exclusiva do Terminal Remoto

## Regra aprovada
- Terminal Mercante Remoto Elite (`remoteTraderCpuElite`) **equipado na nave ativa** (não basta possuir no inventário).
- **Farm Offline:** a venda automática ao lotar o porão fica disponível somente com o terminal. O menu informa o requisito e o servidor verifica a montagem oficial ao iniciar. SQL adicional impõe a mesma regra na tabela das sessões para impedir bypass direto.
- **Autopilot:** com o terminal equipado e a opção de venda ativada (padrão ligado), vende remotamente quando a ocupação atingir o percentual configurado (85% por padrão), sem retornar ao X-1 apenas para vender. Sem o CPU, não tenta vendas automáticas. Preserva rota/compras e tratamento de falhas.
- **Jogador manual:** Configurações → Jogo → COMBATE → **Venda automática de recursos • jogo manual (85% do porão)**; desligada por padrão. Requer CPU equipado e sessão ativa. Não atua com Autopilot, Farm Offline, Portal Astral, segundo plano ou save pendente inválido.
- **Venda manual tradicional:** base X-1/X-8 continua funcionando sem CPU. A venda remota manual já existente continua exigindo o extra.
- **Segurança:** `sell_cargo` executa RPC oficial com preços atuais, inventário/porão e saldo no servidor; vendas automáticas usam serialização econômica, sem novo RPC por frame, com tentativas espaçadas e sem duplicação por sessão.

## Restrições
- No Farm Offline, venda acontece quando o porão lota, conforme simulador já existente. Não se inventam viagens, tempos ou recompensas adicionais; as condições de limite econômico e de resgate seguem inalteradas.
- Autopilot usa o limiar do próprio painel. Para manter a escolha do piloto, o checkbox de venda automática é desabilitado caso não exista CPU; se o piloto desligar voluntariamente essa opção, o Autopilot respeita o opt-out.
- A configuração manual usa a mesma persistência local das preferências de combate atuais (localStorage no dispositivo). Não modifica o save econômico no banco.
- Se um Farm Offline JÁ foi iniciado na versão antiga, a migração não muda retroativamente a sessão existente.

## Instalação
1. ZIP cumulativo de código e assets alterados, aplicado **sobre V106.2**; contém V106.3, V106.4 e V106.5. Não subir outros ZIPs intermediários.
2. Realizar deploy do Render e instalar/recompilar APK com os recursos locais atualizados.
3. Executar **após encerrar qualquer Farm Offline ativo** e depois do deploy: `sql/STELLAR_V106_3_PATCH_MAPAS_POSICAO.sql` (mapas) e `sql/STELLAR_V106_5_CPU_VENDA_AUTO.sql` (bloqueio oficial da venda offline), nesta ordem.
4. Validar em conta normal e ADM: sem CPU, manual/auto offline/bot não vende; com CPU e 85% do porão, venda autorizada pelo servidor. Verificar que o bot não viaja para a base só para vender.
5. Confirmar que as CONFs e extras continuam intactos depois de vender, relogar e resgatar farm offline.

Nenhuma operação em produção executada durante a elaboração. Recompensas e moedas são exclusivamente autoritativas no servidor.
