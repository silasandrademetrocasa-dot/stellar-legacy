# V10.6.5 — Smart Ammo & Missile Fallback

## Troca automática de munição laser
Quando a munição ativa chega a zero:
- x4 -> x3 -> x2 -> x1
- x3 -> x2 -> x1
- x2 -> x1
- SAB -> x2 -> x1

A troca mantém o disparo em andamento quando existe munição reserva.

## Troca automática de mísseis
A ordem segue o dano:
- PLT-3030 -> PLT-2021 -> PLT-2026 -> R-310
- PLT-2021 -> PLT-2026 -> R-310
- PLT-2026 -> R-310

## CPU Auto Buy
- Continua comprando SOMENTE a munição laser atualmente selecionada.
- Continua comprando SOMENTE o míssil atualmente selecionado.
- Primeiro tenta Auto Buy; se não puder comprar, procura uma opção mais fraca já existente no estoque.
- Funciona em PvE, PvP e no P.E.T. Guardião.
- Corrigido um detalhe antigo em que o laser comprado automaticamente no estoque zero podia esperar o tick seguinte para voltar a disparar.
