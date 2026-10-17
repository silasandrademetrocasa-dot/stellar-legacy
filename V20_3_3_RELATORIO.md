# Stellar Legacy V20.3.3 — ADM unificado (3 etapas em um ZIP)

Base: V20.3.0. **Um ZIP completo, sem migrations SQL.**

## 20.3.1 — Crafting visual
- Receita nova e edição das existentes com ingredientes de catálogo (IDs reais), quantidades, produto de recurso/munição/míssil/reparo e prévia.
- Adicionar/remover ingredientes (máximo 12); modelos de criação e duplicação segura com ID vazio e status inativo.
- Salvar usa a rota administrativa existente com validação local de preço, nível, ingrediente e produto. Confirmação antes da publicação.

## 20.3.2 — Economia visual
- Serviços existentes editáveis com seletores de efeitos permitidos (dano laser, escudo, velocidade, carga) e prévia.
- Edição visual de múltiplos efeitos em serviços existentes; **criação de serviço novo aceita exatamente um efeito**, conforme regra existente da API/SQL. Modelos prontos, duplicação como inativo e verificação de ID único.
- Salvar usa a rota administrativa existente, com confirmação e validação numérica.

## 20.3.3 — Navegação do ADM
- Acesso rápido a Mapas, Missões, Crafting, Economia, Eventos e Lojas.
- Contadores nos atalhos de sistemas, busca e filtro de ativos sem remontar formulários em edição.
- Ajustes responsivos para celular; mantidos os botões administrativos originais.

## Testes e cuidado
- Sem SQL novo, sem mudar ações de gameplay, combat, CONF1/2, inventário ou salvamento.
- Execução local de `npm run verify` deve passar antes do deploy. Um deploy real no Render deve ser validado pelo usuário.
- Comece testando com objetos criados **INATIVOS** e habilite somente após revisar os resultados.
- Cópias requerem ID novo; as APIs existentes podem negar permissões ou validar payloads adicionais.
