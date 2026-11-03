# STELLAR LEGACY — V117.3 CUMULATIVA (117.2 + 117.3 + V117.0)

## Entrega

Este ZIP é cumulativo sobre o repositório base `47.7.60`: ele contém o conteúdo do patch V117.0 (inclusive V116.5) + os arquivos atualizados das fases V117.2/V117.3.
**Não é necessário instalar os ZIPs intermediários.** Não aplica SQL nem faz deploy sozinho.

## V117.2 — economia, saves e Autopilot

- Durante uma sequência de abates confirmados pelo WebSocket, a gravação **automática e rotineira** do navegador passa a respeitar no mínimo 18 segundos entre tentativas, preferindo uma pausa de 2,2 segundos entre recompensas, e ainda garante tentativa a cada até 45 segundos de combate contínuo. Fora do combate permanece a rotina anterior (7 segundos).
- Todo checkpoint local continua sendo feito a cada 7 segundos. O save real só é aplicado após validação de revisões econômicas, NPC e minérios no PostgreSQL.
- Alterações intencionais de Hangar, conclusão de missões e seleção de munição mantêm prioridade, sem esperar pelo período de combate.
- A mudança não faz merge de créditos/itens por adição, não ignora `SAVE_NPC_STALE` e não mexe no modelo do Farm Offline.
- Testes de viagem ao X-1 por falta de munição, compra na base, recuperação de operações não confirmadas e retorno de rota são preservados da V116/V117.

**Limite:** diminuir a frequência de PUTs durante NPCs reduz a disputa, mas não elimina totalmente `SAVE_NPC_STALE` porque as revisões de NPC continuam sendo verificadas pelo SQL. A melhoria efetiva só será confirmada por novos logs depois do deploy.

## V117.3 — grupos, mapas, PvP e relés

- Ao entrar numa sala, um piloto substitui qualquer sessão WebSocket anterior da mesma conta, inclusive em outro mapa. Isso impede *fantasmas* duplicados; **contas distintas** não são afetadas.
- Ao fechar um WebSocket antigo, ele só pode apagar a presença cujo objeto ainda pertence àquele socket, preservando o jogador recém-reconectado.
- Estados de posição, tiro NPC, mineração e ataque a relés são recusados quando vêm de um socket substituído ou obsoleto.
- NPCs dividem recompensas somente entre **identidades únicas**, ainda conectadas, vivas, com atividade recente e pertencentes àquela sala. O servidor SQL continua com a concessão idempotente `(user_id, kill_key)`.
- A verificação do grupo do dono do NPC agora acontece apenas quando o socket do dono pertence à própria sala, evitando buscar um jogador que já atravessou para outro mapa.
- Preservados: PvP somente nos Battle Maps, bloqueio de fogo amigo por grupo via SQL, regras de clãs, captura/defesa de relés e cálculo de danos do servidor.

## Verificações executadas

- `npm run check` — JS e grafo de imports.
- `npm test` — incluindo testes novos para reconexão de dois pilotos, recompensa compartilhada única, PvP, relés, save com recompensa chegando em paralelo e rotas do Autopilot.
- Instalação simulada do ZIP com o `scripts/stellar-universal-installer.py` original (consulte o relatório da entrega).

## Homologação depois do deploy (não feita neste pacote)

1. **Conta A + conta B:** entrar no mesmo mapa e Grupo de Batalha; matar NPCs em conjunto; confirmar CR/STL exatos no ledger e uma única BOX para o proprietário.
2. **Conexão:** abrir duas abas com a mesma conta, trocar de mapa, reconectar e ver se não surgem duas naves ou deixam a nave invisível.
3. **PvP:** confirmar dano apenas em 4-1/4-2/4-3, proibir fogo amigo e verificar troca de relé por clãs rivais da mesma facção.
4. **Autopilot:** configurar 8h, esvaziar munição e encher porão em teste seguro; verificar compra, venda, retorno X-1 → X-3 e reconexão, sem cobranças duplicadas.
5. **Saves:** comparar contagem de `SAVE_NPC_STALE` por hora (e número de abates) antes e depois, medir erros de compra e verificar equipamento após reentrar.

**Não executar testes que alterem saldo no banco de produção de forma artificial.** Recompensas e compras de teste devem passar apenas pelas rotas oficiais do jogo.
