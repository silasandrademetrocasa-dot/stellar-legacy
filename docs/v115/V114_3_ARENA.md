# V114.3 — Arena competitiva

## Entrega isolada

- Uma batalha com centenas de registros tem replay visual condensado para no máximo 48 eventos distribuídos ao longo do combate, incluindo primeiro e último golpe.
- O desfecho (vitória/derrota, pontos, tentativas, HP/escudos) continua vindo da RPC da Arena e do **log completo**, não do replay visual abreviado.
- Tentativas e recompensas são cobradas apenas pela RPC existente: nenhum cálculo novo de premiação do lado do cliente.

## Aceite

Uma Arena com 2 a 10 registros deve manter a animação integral. Uma com 100+ registros deve abreviar a parte visual sem truncar o resultado oficial; pular a animação mostra valores finais verdadeiros. A sincronização do contador de tentativas continua obrigatória.
