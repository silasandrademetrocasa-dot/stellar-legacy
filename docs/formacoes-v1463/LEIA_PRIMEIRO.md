# Stellar Legacy Mobile — V146.3 / 47.8.3

## O que passa a ser local

A escolha da formação, o botão ativo e a disposição animada dos drones respondem no aparelho, sem esperar Render, Supabase ou o ACK do save. Funciona sem internet durante uma sessão já carregada, usando somente formações cuja posse já foi confirmada. A animação existente de 0,75 s começa no clique. Trocas rápidas mantêm a última escolha.

A V146.2 já gravava o desejo local, mas o render e o HUD continuavam lendo `confirmedCombatStateV144`. Por isso a mudança parecia presa à validação remota. Agora esses dois consumidores usam a formação local válida.

**Limite importante:** esta entrega torna local a seleção e a apresentação da formação. Os multiplicadores de dano, HP, escudo e velocidade do combate online continuam usando a formação confirmada pelo servidor até o checkpoint ser aceito. Outros jogadores também veem a confirmação autoritativa em seguida. Não foi feita uma simulação multiplayer offline, nem se exibem atributos provisórios como se fossem definitivos. O clique não cura a nave, não cria escudo e não altera os percentuais aprovados. A autenticação/carregamento inicial mantém o fluxo anterior.

## Persistência e reconciliação

A preferência pendente fica em `clientCombatIntentV1463`, dentro do mesmo estado central salvo pelo IndexedDB/A/B/C e pelo espelho de compatibilidade existentes. Não há outro banco, outro saldo ou novo sistema de save. A gravação local continua agrupada pelo escritor existente; a mudança visual não aguarda o disco nem a rede. Mantêm-se a janela de coalescência de 250 ms e o flush ao ocultar/fechar a página. Uma interrupção abrupta antes de concluir a gravação local ainda pode perder essa última preferência, como qualquer snapshot ainda não persistido.

O metadado registra somente proprietário, época de reset, base, escolha desejada e identificação do snapshot submetido. Não contém moedas, inventário ou autorização econômica. Ele é removido da cópia enviada ao servidor. A formação e os atalhos continuam no campo canônico `combatHudV144`, pelo PUT/delta e escritor já existentes.

O envio ocorre em segundo plano, pela estratégia já existente de agrupar alterações. Não foi acrescentado endpoint, SQL por clique ou polling de formação. Uma fila econômica anterior ainda pode adiar o checkpoint, mas não impede o layout local.

- A base original é preservada entre cliques, evitando conflito artificial ao trocar várias vezes antes do primeiro ACK.
- Um recibo do próprio snapshot anterior pode atualizar a base sem descartar a escolha mais recente.
- Uma mudança independente na outra CONF é conciliada. Um conflito real no mesmo campo com outra sessão restaura o estado confirmado e avisa o jogador.
- Uma escolha confirmada encerra a pendência. Trocas de munição do autopilot são normalizadas para não manter a preferência em retry infinito.
- Conta diferente, reset ADM ou posse revogada impedem reaplicar o desejo antigo.
- Ao relogar, recupera-se somente a intenção válida de formação/atalhos; moedas e inventário não vêm desse metadado.

Os nove layouts D1–D8, movimentos, raridades, bônus, HUD de 18 slots e independência CONF1/CONF2 da cumulativa anterior estão preservados.

## Instalação

1. Guarde uma cópia do projeto atual.
2. Aplique `Stellar_Legacy_V146_3_CUMULATIVA.zip` pelo Instalador Universal existente, sobre o projeto atual. O ZIP é cumulativo desde a base original V144.1/47.7.80 e inclui as correções V146.2. As artes já presentes não são repetidas no pacote.
3. Publique os fontes atualizados pelo processo habitual e gere um novo APK com a mesma assinatura. Instale como atualização, sem apagar dados.
4. **Não precisa de SQL novo.** Mantém as migrações V146 já aplicadas. SQL antigo incluído no histórico da cumulativa não deve ser reaplicado para esta correção.

Nenhum deploy ou alteração de banco de produção foi executado nesta entrega. Para rollback, restaure o código/APK V146.2 a partir do backup, sem apagar o save ou a fila e sem fazer rollback do SQL V146. A versão anterior ignora o novo metadado de preferência; não houve migração destrutiva.

## Teste no Android

Depois de entrar no jogo, desligue a rede e alterne formações já possuídas. O botão e os drones devem responder imediatamente, iniciando a transição. Faça várias trocas e confirme que a última fica selecionada. Altere as escolhas nas duas CONFs. Aguarde a gravação local, encerre, reconecte e confira a recuperação/reconciliação. Confira também HP e escudo: a troca local não deve criar recursos. Para testar atributos de combate online, aguarde a confirmação em segundo plano; eles não foram convertidos para autoridade offline.

A validação automatizada não substitui este teste no aparelho real. Não foi compilado nem assinado um APK neste ambiente. A migração offline geral do jogo continua com as pendências documentadas na V146.2; esta versão não declara todos os módulos migrados.
