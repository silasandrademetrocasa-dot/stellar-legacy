# STELLAR LEGACY V19.0.15 — Progressão do piloto em aproximadamente 150 horas

## Implementado

- Níveis de piloto **1–10** mantêm exatamente a progressão original (V17.7.0).
- Nova curva de XP acumulado para os níveis **11–44**, calculada por interpolação contínua da fórmula antiga entre os marcos.
- Marcos-alvo da jornada **começando no nível 7**, com nave Elite ofensiva, sem Premium, missões, eventos nem designers: nível 10 (~4 h), nível 18 (~20 h acumuladas), nível 22 (~45 h), nível 27 (~90 h), nível 32 (~150 h).
- O nível 32 exige **741.049.480 XP acumulados**, contra **9.586.510.147 XP** na curva anterior; o XP mínimo do nível 7 segue **2.300.093 XP**.
- Níveis 33–44 seguem progressão contínua proporcional à curva antiga, mantendo o endgame.
- Saves existentes são convertidos uma única vez na inicialização (campo `xpModelV1915`), preservando o nível do piloto e o percentual exato dentro do nível anterior, sem recompensas falsas, resets ou quedas de nível.
- A conversão histórica V17.7.0 foi mantida separada, permitindo migrar saves muito antigos corretamente.
- Arena e Clãs no Supabase aceitam **as duas curvas em paralelo**, identificando o marcador `xpModelV1915` no save da conta. A migração SQL **não modifica contas**.
- Desbloqueios X-5 no nível 18, X-6 no 22, X-7 no 27, X-8 no 32, regras territoriais e mapa PvP 4-X continuam sem modificações.

## Implantação

1. A migração SQL `sql/STELLAR_V19_0_15_PROGRESSAO_PILOTO_150H.sql` precisa estar aplicada no Supabase primeiro (se não estiver, o cálculo de nível da Arena/Clã continua usando a versão antiga).
2. Fazer deploy do **ZIP completo V19.0.15**, enviado pela raiz do repositório via instalador principal.
3. Entrar no jogo, verificar o nível de um piloto já existente e o percentual de XP preservado, e confirmar que após salvar e entrar novamente o nível não muda.

## Limites

As ~150 horas são uma **meta projetada de farm ativo** baseada nas taxas estimadas de XP/h dos novos NPCs e equipamentos. Não é cronômetro de jogo e o tempo real variará com tempo de deslocamento, eventos, missões, morte, consumíveis, jogadores simultâneos e bônus de XP.
