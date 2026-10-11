# Stellar Legacy V18.2.3 — BOX BÔNUS + POEIRA STELLAR

## Implantação

1. Envie **stellar-legacy-v18.2.3-BONUS-BOX-POEIRA-STELLAR.zip** à raiz do GitHub.
2. Execute Actions → Instalar versão do Stellar Legacy → Run workflow.
3. Aguarde a publicação automática no Render. Faça um recarregamento completo da página.

**Banco já atualizado no Supabase principal:** giro dos três portais a 100 STL. Se usar outro banco, execute `sql/V18_2_3_GATE_SPINS_100_STL.sql` apenas uma vez. Nenhuma tabela ou migração nova é necessária.

## BOX BÔNUS

- 12 caixas por mapa normal/batalha, 6 por mapa de Portal Astral.
- Distribuição individual por piloto, registrada no próprio save por mapa. Não recria caixas ao relogar ou trocar mapas; reposição após 40–70 segundos.
- Coleta manual por proximidade (37 unidades); o AUX-9 no módulo **Salvager (box)** também coleta automaticamente.
- Cada BOX concede exatamente uma das 7 recompensas, com 1/7 de probabilidade por tipo (distribuição uniforme); quantidades inteiras aleatórias inclusivas.

| Tipo | Quantidade por BOX | Identificador de jogo |
|:---|---:|:---|
| Munição PLS-1 (x1) | 15–100 | `ammo.lcb10` |
| Munição PLS-2 (x2) | 15–75 | `ammo.mcb25` |
| Munição PLS-3 (x3) | 15–50 | `ammo.mcb50` |
| Munição SIP-2 (sugar escudo) | 15–75 | `ammo.sab50` |
| Créditos | 100–10.000 | `profile.credits` |
| Stellarium | 1–200 | `profile.uridium` |
| Poeira Stellar | 1–2 | `stellarDust` |

A Poeira não ocupa porão de carga e permanece no save. O jogador vê seu saldo no Materializador.

## MATERIALIZADOR

- Aurora/Alfa, Nexus/Beta, Eclipse/Gamma: **100 STL por giro** em todos.
- Premium com pagamento em STL: **90 STL por giro**.
- Alternativa FREE: **1 Poeira Stellar por giro**, sem debitar STL e sem desconto Premium na Poeira.
- Botões separados para 1, 5, 10, 50 e 100 giros; saldo insuficiente bloqueia os botões.
- O servidor valida e desconta a forma de pagamento antes de sortear cada lote; `payment: 'uridium' | 'dust'`.
- Recompensas e probabilidade do Materializador continuam as da versão anterior.

## IMAGENS

`public/assets/v18/bonus/bonus-box.webp` — caixa no mapa.

`public/assets/v18/bonus/stellar-dust.webp` — recurso no painel dos portais.

São sprites WEBP 144×144 com transparência (aproximadamente 7 KB e 11 KB), sem animações pesadas no modo BAIXO.

## TESTES

`node tests/bonus-box-dust-regression.mjs`

`node tests/shop-confirmation-regression.mjs`

`node tests/mobile-lite-regression.mjs`

`node tests/coupon_ui_smoke.mjs`

Teste em dispositivo real após deploy: coletar BOX manualmente, ativar Salvager do AUX, relogar, navegar entre X-1/X-2 e testar 1 giro em cada opção de pagamento.

Nota: a coleta da caixa segue a arquitetura atual do jogo (recompensa e posição persistidas no save do piloto no cliente); o **gasto da Poeira/SLT em giros é validado no servidor**. Uma futura migração do próprio loot para autoridade completa do servidor seria recomendável contra adulteração de saves.
