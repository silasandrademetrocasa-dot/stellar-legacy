# Rotas e validação V146.3

| Operação | Antes | Agora |
|---|---|---|
| Clique em formação possuída | Gravava desejo, mas HUD/render esperavam a formação confirmada | Atualiza desejo, HUD e render localmente |
| Persistência de desejo | Apenas variável em memória; escolha local podia ser descartada no bootstrap | Metadado no save único e restauração validada por conta/reset/posse |
| Vários cliques enquanto o save viajava | Base podia passar a ser um desejo ainda não confirmado | Uma base confirmada e a escolha mais recente |
| ACK de escolha intermediária | Podia conflitar e desfazer a última troca | Reconhece o snapshot próprio, preservando a última intenção |
| Transporte | PUT/delta de save existente | Mesmo transporte, agrupado em segundo plano; sem endpoint novo |
| Posse, combate online, vitais | Autoridade do servidor | Preservada; não recebe bônus de uma escolha ainda não confirmada |

Os testes novos executam o callback real do jogo com `fetch` indisponível, 100 seleções consecutivas, CONF1/CONF2 independentes, ACK intermediário, conflito entre sessões, persistência/reabertura em IndexedDB com A/B/C, resposta perdida, rejeição de formação não possuída, reset/conta/posse revogada e mudança de munição do autopilot. O sender real também é executado para comprovar que a gravação da submissão local ocorre antes do HTTP existente e que o metadado privado do dispositivo não é enviado.

O teste de 100 cliques não faz chamadas de rede no callback e preserva moedas/HP/escudo. Isso não significa zero rede no jogo: combate, autenticação e sincronização continuam usando seus serviços. Não há medição de latência/FPS ou tráfego real no Android nesta entrega.

Uma rodada focada encontrou um erro na detecção de ACK sem submissão anterior: dois IDs ausentes podiam ser tratados como correspondentes. O código foi corrigido para exigir ID real e o cenário de alteração independente entre CONFs passou. Os resultados finais completos estão nos logs desta pasta.
