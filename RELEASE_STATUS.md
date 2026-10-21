# Stellar Legacy V42.6.0 — etapa 2/2

**Base:** V42.3.0. **Destino:** V42.6.0. **Pacote:** ZIP incremental.

| Bloco | Implementado / validado | Ainda pendente |
|---|---|---|
| Exploração | Investigação instanciada em 3 setores, prazo e verificação de abates do ledger, recompensa em pesquisa, painel, ADM | Novos mapas pilotáveis do motor 2D, NPCs exclusivos e anomalias visíveis no mundo |
| Economia | Custódia de módulos fabricados, ofertas, compra, cancelamento, transação e taxa ADM; mercado PAUSADO por padrão até teste de duas contas | Trocas diretas e ordens parciais / leilões |
| Clãs | Projetos de pesquisa persistentes, pontos e metas ADM | Estruturas físicas e efeitos no combate |
| Segurança | Proteções SQL, idempotência, limites HTTP, checagem de bloqueios, RLS | Testes multiplayer concorrentes com contas reais, auditar sistema antigo de combate |
| Combate | Nenhuma mudança perigosa no core | Dano, escudo, movimento, raid boss e PvP cooperativo sincronizados |

### Status dos testes
- Script SQL validado via BEGIN/ROLLBACK no Supabase (não instalado).
- Testes unitários de validação aprovados; scripts Node sintaticamente válidos.
- Patch simulado duas vezes na base fixture V42.3, sem duplicações.
- Pipeline GitHub/Render e testes E2E reais **não executados neste ambiente**.

Não tratar o número 42.6.0 como confirmação de entrega total de mapas de voo e raids.
