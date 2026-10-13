# Plano V19 ADM — fases independentes

## Fase 1 — ENTREGUE em V19.0.5
- Organização das áreas ADM; Mundo & Mapas/BOX/NPCs; Portais Astrais separado; Preços com subaba de Leilão (informativa).
- Formulários visuais de edição de configurações existentes no sistema Missões, Economia, Crafting e Passe.
- Botões expandir/recolher; designer ativo destacado; auditoria visual dos atributos no Perfil de Piloto.
- Não cria novas categorias de missão, receitas, temporadas nem mapas nesta fase.

## Fase 2 — PORTAIS E MATERIALIZADOR (AINDA NÃO IMPLEMENTADA)
- Criar configuração central com RPC ADM no Supabase e regra de execução no servidor Render.
- Retirar a vida da tabela de prêmios aleatórios do Materializador, sem sumir com reservas já possuídas.
- Comprar +1 vida a 10.000 Stellarium, validado no servidor com débito real e saldo insuficiente bloqueado.
- Editor de recompensas do Materializador por peso, tipos de prêmio e quantidades.
- Editor de rounds/ondas: NPCs, quantidade, tempo de espera, recompensa por onda, por round e final do portal; testes contra fraude.

## Fase 3 — CRIAÇÃO COMPLETA E ECONOMIA (AINDA NÃO IMPLEMENTADA)
- Editor para CRIAR novas categorias e missões individuais com escolhas de objetivo e recompensa.
- Editor para CRIAR receitas no Crafting, novos serviços na Economia e organizar precificação do Leilão com backend seguro.
- Controle de tabelas de preços separado para Loja Comum, Premium e Leilão.
- Editor de novas temporadas e níveis do Passe, além de edição de prêmios existentes.

## Fase 4 — ESTABILIZAÇÃO (AINDA NÃO IMPLEMENTADA)
- Regressões reais no Render e no celular, autorização, save/rollback, monotonicidade de nível.
- Auditoria anti-cheat: servidor como fonte da verdade para itens, economia e prêmios.

### Ordem de instalação
Suba cada ZIP pelo instalador GitHub após validar o anterior. Não execute SQL para a Fase 1. Guarde o ZIP da V19.0.4 para rollback.
