# V10.10 — Recompensa Diária da Arena

## Ligas por Rating
- CADETE: abaixo de 1.000
- BRONZE: 1.000–1.199
- PRATA: 1.200–1.399
- OURO: 1.400–1.599
- PLATINA: 1.600–1.799
- DIAMANTE: 1.800–2.099
- LENDA: 2.100+

## Recompensa diária
- 1 resgate por dia, reset à meia-noite no horário de São Paulo.
- Recompensas em Créditos, Uridium, XP e Bônus de Reparo.
- O valor base aumenta conforme a liga.
- Bônus de posição: #1 +50%, #2 +35%, #3 +25%, Top 10 +15%, Top 25 +5%.
- Bônus de nível: +5% a cada 10 níveis, até +20%.
- Top 3 recebe Bônus de Reparo adicional.

## Segurança
- Resgate atômico no PostgreSQL/Supabase.
- Chave única por jogador + dia impede resgate duplicado em refresh, múltiplas abas ou cliques simultâneos.
- O prêmio atualiza o save online e o perfil/ranking no mesmo resgate.
