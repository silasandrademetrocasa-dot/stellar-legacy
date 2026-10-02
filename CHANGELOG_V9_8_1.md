# V9.8.1 — Gate Timing Fix

## Galaxy Gate ALFA
Fluxo validado e corrigido:

1. Primeira onda do Round entra.
2. Próximas ondas do MESMO Round entram a cada 10 segundos, sem precisar limpar a anterior.
3. Depois que todas as ondas daquele Round já foram geradas, o jogo espera eliminar TODOS os NPCs restantes.
4. Somente quando o contador de NPCs vivos chega a zero começa o intervalo entre Rounds.
5. O intervalo entre Rounds agora é exatamente 10 segundos.
6. Depois dos 10 segundos entra a primeira onda do Round seguinte.
7. O ciclo de ondas de 10 segundos recomeça normalmente.

Antes, o intervalo entre Rounds estava em 8 segundos. Corrigido para 10 segundos.
