# V19.0.3 • Cupons ADM

**Nova interface:** ADM → CUPONS. Mostra 99 opções de recompensas baseadas no catálogo de itens e naves da V19.0.2, com combinação até 12 prêmios por código.

**Categorias:** naves comuns/elite/evento, lasers, geradores, extras, drones, PLS, CMT, recursos, Créditos/STL, Premium por duração e Passe Premium da temporada ativa.

**Limites:** código manual ou gerado no banco; quantidade de usos global; 1 uso por conta; nível mínimo; datas; ativação/desativação. A administração não pode editar prêmios de um código após distribuí-lo: desative e crie outro.

**Segurança:** SQL com SECURITY DEFINER confere `auth.uid()` contra `game_admins`; RLS ativada; nenhuma tabela concede acesso direto a usuários comuns; catálogo validado na criação e no resgate; snapshot de recompensas e código ficam registrados; atualização do save e do contador acontece na mesma transação; token de resgate do save protegido por trigger pré-existente. Os cupons V18 antigos continuam aceitos pelo endpoint.

**Deploy:** o SQL `sql/V19_0_3_CUPONS_ADM_CATALOGO.sql` já foi aplicado no Supabase. Subir somente o ZIP no GitHub. Nenhum pagamento Mercado Pago/Google Pay é ativado.

**Importante:** se um usuário já tiver a nave escolhida, já possuir Passe Premium da temporada ou não tiver espaço para os drones, o resgate é rejeitado por completo, sem gastar uso do cupom. Teste o cupom com uma conta sem privilégios antes de distribuí-lo em massa.
