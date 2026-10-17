# Stellar Legacy — Antifraude e Segurança

## Instalação

1. SQL aplicado no projeto Supabase conectado. Migrações registradas:
   - `stellar_v22_6_0_antifraude_auditoria_autoban`
   - `stellar_v22_6_1_inventory_guard`
2. Envie apenas este ZIP para a raiz do GitHub e execute **Actions → Instalar versão do Stellar Legacy → Run workflow**.
3. Aguarde o Render reiniciar e confirme que o servidor está com `SUPABASE_SERVICE_ROLE_KEY` no ambiente privado.
4. Entre como ADM → **Segurança e Antifraude**: confira o painel de incidentes.
5. Valide uma compra normal de munição, a troca de configuração, a gravação do save e captura A/B/C.

## Regras do antiban / autoban

- Incidentes comuns, lag, reconexão e deslocamento suspeito geram somente auditoria (aviso).
- Tentativas graves de falsificar proprietário, revisar campos exclusivos do servidor ou enviar preços manipulados são bloqueadas e registradas.
- **3 registros críticos diferentes no tempo (reincidência ao longo de 2 horas)** resultam em **suspensão de 24 horas**, exceto ADM; tentativas repetidas em um minuto são deduplicadas para reduzir falsos positivos.
- Conta suspensa é impedida de entrar, perde sessão ativa e tem conexão multiplayer revisada em até ~45 segundos.
- O ADM pode revisar incidentes no painel, e remover a suspensão pela ferramenta já existente em **Jogadores → Remover Ban**.
- Não há exclusão automática de saves nem ban permanente automático.

## Proteções de economia

- Valores de CR e STL do save fora de limites plausíveis e grandes saltos são recusados; permissões no banco barram atualização direta fora das regras, não apenas pela API Render.
- Inventário, munições, foguetes e recursos não aceitam quantidades negativas, não inteiras ou acima de limites de segurança.
- Preços e descontos da Loja são calculados a partir do catálogo do servidor: tentativas explícitas de injetar valores na requisição são recusadas.
- As missões, cupons, passes e campanhas continuam dependentes das regras de segurança que já existiam.

## Importante antes de venda em dinheiro real

**Esta é uma camada de proteção e contenção, não uma economia integralmente autoritativa.** O save antigo ainda contém progresso computado no navegador, incluindo parte das recompensas. Alterações fraudulentas pequenas e feitas dentro dos limites por save podem não ser detectadas. Antes de pagamentos reais, migrar todas as concessões de moeda, itens, XP, loot, missões e equipamentos para transações exclusivas no servidor, com registro imutável, comparação de versões e idempotência.

Nenhuma compra real foi habilitada. A Google Play permanece em pausa.

## Rollback de emergência

Se uma regra de integridade bloquear um save legítimo, **não apague saves nem tente editar moedas diretamente**. Investigue o incidente e ajuste os limites do backend/SQL em nova migração. É possível desativar temporariamente apenas o gatilho defeituoso em janela de manutenção, mantendo a auditoria ativa.
