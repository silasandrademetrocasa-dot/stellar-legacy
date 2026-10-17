# STELLAR LEGACY V20.3.0 — ADM MISSÕES VISUAIS

## Objetivo
Fim da rodada de experimentos de FPS; etapa de criação de conteúdo pelo painel administrativo.

## Melhorias
- Três modelos no ADM → SISTEMAS → MISSÕES: Patrulha NPC, Coleta minério e Expedição mista.
- Botão DUPLICAR em cada missão personalizada existente; a cópia começa **inativa**, sem ID e com objetivos independentes. Salvar requer novo ID, evitando sobreposição involuntária.
- PRÉVIA automática dos objetivos, categoria e prêmios durante a edição, inclusive na tela pequena.
- Validação no frontend de categoria, ID, alvo NPC/minério, quantidades e bônus, sem substituir as validações do servidor.
- Módulo puro `public/modules/admin-mission-builder.js` com testes automatizados.

## Segurança / dados
- Nenhuma SQL nova, nenhuma alteração nas rotas REST/SQL existentes, sem novos campos de save.
- Nenhuma missão é publicada ou modificada automaticamente ao selecionar modelo ou duplicar; somente botão SALVAR envia a API existente.
- Modelos e cópias começam desativados, e publicação exige confirmação.
- Duplicação não remove nem modifica a missão original.
- Dados dos jogadores, combate, moedas e progressão não alterados intencionalmente.

## Como testar
1. No GitHub Actions instalar o ZIP completo e confirmar `/health` versão 20.3.0.
2. ADM → SISTEMAS → MISSÕES → carregar cada modelo e verificar campos e prévia.
3. Digitar ID único e conferir preview + validação; opcionalmente SALVAR como inativa.
4. No painel de missões personalizadas clicar DUPLICAR em uma missão de testes; conferir ID vazio, status inativo, prêmios e objetivos copiados.
5. Confirmar que a original permanece intacta e que os painéis ECONOMIA/CRAFTING continuam funcionais.

## Limitações
O editor visual existente continua restrito aos tipos de objetivo suportados atualmente pela API: eliminar NPC e coletar minério. Novos tipos exigem implementar e validar no jogo e no servidor em uma etapa própria. Testes locais não substituem teste de integração com Supabase/Render.
