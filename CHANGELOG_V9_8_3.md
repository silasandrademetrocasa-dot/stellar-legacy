# V9.8.3 — Alpha Combat Fix

## Correção crítica
- Corrigido possível congelamento do ALFA sem geração de NPC.
- O Gate agora recria automaticamente o timer se um save antigo estiver sem `nextWaveAt`.
- Adicionado cache busting para impedir HTML novo rodando com CSS/JS antigo em cache.

## Regras do ALFA
1. Salta para o ALFA.
2. 10 segundos de preparação.
3. Surge a primeira onda no limite do radar.
4. A cada 10 segundos surge a próxima onda do mesmo Round, mesmo que ainda haja NPCs vivos.
5. Depois da última onda, é obrigatório eliminar todos os NPCs restantes.
6. Com zero NPCs, começa uma nova contagem de 10 segundos.
7. O próximo Round entra e o ciclo recomeça.

## IA
- NPCs do Gate ignoram distância de aggro.
- Todos perseguem o jogador continuamente até entrarem em alcance de ataque.
- Spawn distribuído ao redor de 82%–96% do raio mostrado no minimapa.
