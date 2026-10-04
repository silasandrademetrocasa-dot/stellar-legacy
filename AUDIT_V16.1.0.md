# Stellar Legacy V16.1.0 — ETAPA 2 — ECONOMY GUARD

## Objetivo
Mover transações econômicas críticas que ainda eram processadas pelo navegador para validação/aplicação no Render usando os preços LIVE OPS do Supabase.

## Autoridade movida para o servidor
- AUTO BUY de munição laser e mísseis.
- Venda do Trader (recurso individual e porão inteiro).
- Venda de equipamentos do inventário por 50% do preço LIVE OPS.
- Venda de drones, com devolução dos equipamentos instalados ao inventário.
- Liberação de slots de arma/escudo do AUX-9.
- Compra de Núcleos Quânticos.
- Conversão de Núcleos Quânticos em Pontos de Pesquisa.
- Materializador dos Portais Astrais: custo, sorteio e entrega da recompensa.

## Regras de segurança
- O cliente informa somente a intenção da ação; preço, saldo e recompensa são recalculados no servidor.
- O Render relê o catálogo LIVE OPS do Supabase antes das mutações.
- Transações por usuário são serializadas para reduzir corrida/double-spend.
- Trader valida X-1 do próprio território antes da venda.
- Slots do AUX-9 validam propriedade, nível, slot seguinte e preço publicado.
- Materializador valida protocolo, desbloqueio, preço, desconto Premium e sorteios no servidor.
- AUTO BUY não usa mais preço hardcoded do cliente e evita compras duplicadas enquanto uma requisição está pendente.

## Compatibilidade
- Nenhuma tabela SQL nova é necessária nesta etapa; reutiliza `live_shop_prices_v16`, `game_saves`, `profiles` e Premium existentes.
- Estrutura do save V16.0 preservada.
- Shared Universe V15.x preservado.

## Fora do escopo desta etapa
- Chat Dock entra na V16.2.
- Drone Designers entram na V16.3.
- Ship/AUX Designers entram na V16.4.
- Custos internos da Árvore de Piloto/reparo geral continuam para uma etapa posterior de hardening total; esta etapa fecha especificamente as transações definidas no roadmap V16.1.
