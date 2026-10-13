# AUX-9 • Correção de mineração V18.2.7

**Sintoma:** o AUX-9 com EXTRATOR atravessa o setor até uma pedra, mas fica parado e não recolhe.

**Causa:** o cliente usava `collect_ore` sem identificar que a coleta vinha do AUX. O servidor só aceitava o pedido se a *nave* estivesse a 90 unidades da pedra, mesmo quando o AUX chegava até ela. O estado do AUX podia ser atualizado lentamente quando a nave estava parada.

**Correção:** `collect_ore` aceita `collector = pet` ou `ship`; o cliente transmite o estado do AUX antes do pedido e aguarda 350 ms entre tentativas. No servidor, pet requer `owned` e `activeGear='ore'` no estado recebido, 90 unidades da pedra, pedra no alcance do radar e AUX dentro do tether. O coletor nave mantém raio de 90.

**Recompensas:** minério é retirado só uma vez do mapa compartilhado. A resposta marca qual coletor recolheu; o jogo adiciona o minério ao porão, atualiza missões e jornada, conta telemetria e dá 3 XP ao AUX. Quando o porão estiver cheio, o AUX não inicia uma coleta nova.

**Verificação pós-deploy:** equipar EXTRATOR, posicionar a nave dentro do radar de uma pedra, aguardar o AUX chegar e ver recurso sair do mapa e entrar no porão. Repetir parado, movendo a nave, após pular de mapa e durante SURTO DE MINERAÇÃO. Conferir que AUX sem módulo não recolhe.

**Instalação:** ZIP completo; não requer migração SQL.
