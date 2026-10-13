# Stellar Legacy V19.0.8 — Fase 03A

Esta etapa amplia os editores **sem exigir JSON manual**.

- Missões: criador com tarefas kill/ore, quantidade, tipo, prêmio em CR/STL/XP, categoria, editar e excluir. RPC existente de missões customizadas.
- Economia: cadastro de novo serviço com efeito permitido (dano laser, escudo, carga, velocidade) e custo/duração.
- Craft: cadastro de receita com 3 ingredientes e saída em recursos, munições ou mísseis.
- Passe: cadastro seguro de temporadas inativas e tiers sem prêmio até a configuração, seletor de temporadas.
- Leilão: configuração ao vivo do preço mínimo da NOVA e piso dos demais lotes, validada dentro do lance no Supabase.

## Instalação

SQL `sql/V19_0_8_ADMIN_CONTEUDO.sql`, depois o ZIP completo pelo workflow principal.

## A verificar

Testes reais de escrita do ADM e compra em conta de teste, deploy Render e desempenho mobile antes da Fase 04.

## Próxima subfase

03B: criador de mapas NOVOS com rotas/spawns e edição individual de lotes do Leilão. Não antecipar isso sem validação servidor e integridade dos saves.
