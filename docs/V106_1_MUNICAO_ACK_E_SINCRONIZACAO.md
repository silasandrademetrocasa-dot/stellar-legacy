# Stellar Legacy V106.1 — Munição com ACK de salvamento

## Base
Aplicar **sobre V106 Unified Save Engine**. Incremental, sem SQL.

## Causa identificada
O HUD de lasers/mísseis trocava a seleção e chamava `saveGame()` local, mas não priorizava o PUT ao Supabase. Um conflito `SAVE_NPC_STALE` chamava `installEconomyState()` e substituía a seleção do cliente pela anterior, mesmo que a munição selecionada estivesse em estoque. O Autopilot também tinha um fallback sem `saveGame()`.

## Mudanças
- Seleção de laser e foguete, atalhos, fallback por estoque e Autopilot usam a mesma rotina de save com debounce de 180 ms e fila única V106.
- Preferência pendente de cada tipo é preservada ao reler o save e só é liberada quando um snapshot contendo aquela seleção recebe ACK.
- ACK de um snapshot antigo não remove uma escolha posterior feita enquanto o PUT estava em andamento.
- Durante o resgate econômico, o servidor mantém autoridade sobre créditos, STL, inventário, estoques e recompensas; somente `selectedLaserAmmo`/`selectedRocket` pendentes são reconciliados.
- Início de farm offline exige confirmação de mudança pendente de munição.
- Nenhuma mudança no SQL nem regras de loot, consumo, compra ou limite de farm.

## Atenção
Se a munição selecionada acabar em combate, o jogo **continua** podendo mudar para a munição de reserva — é comportamento intencional e sinalizado.
A suspeita de alterações nos equipamentos depois do farm offline **ainda exige teste de reprodução dedicado**; este patch não altera a liquidação econômica do farm.

## Teste Android
1. Troque UCB-100 para LCB-10 e volte para UCB-100 enquanto o Autopilot ataca; confira a seleção após 10 s e após relogar.
2. Repita para PLT-2026; abra a loja e venda recursos; confira a munição antes e depois.
3. Com farm offline encerrado, valide estoque e CONF1/CONF2 sem re-equipar antes de capturar o estado.
4. Compare erros `SAVE_NPC_STALE` e persistência. O objetivo é preservar preferências apesar de conflitos, não necessariamente eliminar todas as rejeições.
