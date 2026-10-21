# Stellar Legacy — V39 a V42 em um único ZIP

**Base: V38.1.0**. Saída do Instalador Universal: **42.0.0**. Atualização incremental sem copiar `game.js` e sem tocar em sprites existentes.

## Funcionalidades reais incluídas neste primeiro pacote unificado

| Roadmap | Entrega funcional | Limitações explícitas |
|---|---|---|
| V39 Astral Forge | 4 receitas, consumo transacional de Aurorium/Nexium/Eclipsium, inventário de protótipos dedicado, custos editáveis no ADM | Protótipos **não equipam** e **não modificam estatísticas** da nave nesta versão |
| V40 Galactic Warfare | Esquadrões de até 4 pilotos, código de convite, mesma facção, saídas, ranking de facções com abates verificados do ledger de NPCs | **Não** integra PvP de esquadrão, ocupação territorial ou raid cooperativa |
| V41 Unknown Universe | 3 expedições temporizadas, custo CR, progresso/retirada controlados pelo servidor, pontos de pesquisa persistentes | **Não** cria mapas, portais ou NPCs novos; pesquisa não confere buffs |
| V42 Stellar Civilization | 3 projetos de facção, doações atômicas de recursos, progresso coletivo, custos editáveis pelo ADM | **Não** cria mercado entre jogadores nem bônus globais ativos |

### Segurança e performance
- Sessão autenticada em todas as rotas. SQL com RLS e tabelas não expostas para usuários.
- Operações econômicas `forge`, `start`, `claim`, `donate` com travamento do save e idempotência por UUID único.
- Uma única expedição pendente por jogador; grupo com 4 membros e bloqueio de facção diferente.
- Economia editável pelo ADM, com validação de campos e limites no banco.
- A interface de controle é independente do Canvas, carrega por demanda e não roda dentro de `requestAnimationFrame`.
- A segurança do material-base continua dependendo do sistema legado de saves; não considere produção antifraude total sem testes end-to-end e autoridade de combate no servidor.

## Implantação
1. Execute `sql/STELLAR_V39_TO_V42_UNIFIED.sql` **uma única vez** sobre a base V38.1.
2. Envie este ZIP à raiz do GitHub e rode o Instalador Universal. Requer `baseVersion=38.1.0`.
3. Rode `npm run verify`, cheque log do Actions, Render, e tela `✦ UNIVERSO`.
4. Faça uma transação de teste de cada tipo, sincronize o jogo e confira `serverPurchaseRevision`.

### Operações de risco / rollback
A migração não altera `game_saves` durante instalação. As interações posteriores têm custo real em materiais/CR. Faça backup antes de testar. Se houver incidente, despublique V42 e preserve o histórico para auditoria; nunca faça `DROP` das tabelas sem procedimento de migração.

### Pendente para concluir integralmente o roadmap V39–V42
- Bônus dos módulos conectados ao combate com validação de servidor.
- PvP de esquadrões e objetivos de território autoritativos.
- Novos setores espaciais e eventos em mapas.
- Comércio entre jogadores, infraestrutura avançada e economia de clãs.
- Interface ADM ampliada para eventos, NPCs, recompensas e comércio.

O pacote unifica o **primeiro conjunto funcional** dos quatro eixos; não confundir com a conclusão integral dessas expansões.
