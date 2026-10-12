# Stellar Legacy V18.2.13 • Prévia comercial no jogo (ADM)

## Conteúdo
- 4 Premium: 7 dias por R$ 14,90 (avulso), 1 mês por R$ 39,90, 3 meses por R$ 99,90, 6 meses por R$ 179,90 (renovações simuladas).
- 3 pacotes: Iniciante R$ 9,90, Piloto R$ 24,90, Avançado R$ 49,90 (recompensas em balanceamento).
- Passe de Temporada: preço dinâmico do SQL de staging, atualmente R$ 19,90.
- Tiers adicionais: +1 por R$ 2,90, +3 por R$ 7,90, +5 por R$ 11,90 e +10 por R$ 19,90. Máximo da temporada atual 30.

## Separação/segurança
O catálogo SQL `premium_offers_stage_v1832` é separado do catálogo comercial legado. Apenas RPCs `admin_preview_premium_stage_v1832` e `admin_simulate_premium_checkout_v1832` acessam o staging com validação administrativa no servidor. Nenhuma alteração nos saves, inventários, saldos e benefícios reais. Não existem integrações reais com PSP. Pilotos autenticados não ADM veem a vitrine de testes em modo somente leitura via RPC pública autenticada v1833; o botão de simulação é exclusivo do ADM. A seção Loja Atual preserva os antigos testes (que *podem* conceder itens ao ADM); a prévia da V18.2.13 não concede.

## Testes
Rota REST autenticação Supabase; chamadas sem permissão negadas. Chaves de idempotência persistem em memória até confirmação e impedem duplicata em retry de rede. Testar ponta-a-ponta após GitHub/Render publicar.

A RPC SQL V18.3.3 foi instalada antes da entrega. Sem necessidade de executar SQL após deploy.
