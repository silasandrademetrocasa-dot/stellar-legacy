# AUDIT V16.7.5 — AUCTION / AUTO-COMBATE / X-1 / AUX-9

## Regras ajustadas
- Nova some do Leilão quando a conta já possui 8 drones.
- AUTO-COMBATE escolhe somente o NPC mais próximo dentro do alcance laser comum e visível no viewport.
- X-1: NPC persegue passivamente, mas não causa dano até o jogador atacar primeiro.
- AUX-9 acompanha a velocidade efetiva da nave e usa aceleração curta apenas para recuperar distância.
- Progressão AUX-9 adaptada para 20 níveis, sem combustível.
- Capacidade máxima no nível 20: 12 lasers, 22 escudos, 6 módulos e 12 protocolos.
- Bônus de nível alternam DANO e ESCUDO; níveis 4, 8 e 20 liberam tiers superiores.

## Banco
- LIVE OPS recebeu preços dos slots AUX-9 16–22.
- Migration: sql/V16_7_5_AUX_SLOT_CAPACITY.sql
