# Stellar Legacy V42.3 — ZIP 1/2 (V42.2 + V42.3)

## Funcionalidades realmente entregues
- Inventário da V42 reaproveitado, sem duplicar itens.
- Equipagem persistente em configurações 1 e 2, com slots e quantidade validada no PostgreSQL.
- Nenhuma mudança nos HP/escudo quando o jogador troca a configuração: não existe reparação por troca.
- Operações cooperativas semanais progressivas (três faixas) com abates verificados pelo ledger do servidor, custo zero e recompensa em pesquisa, com apenas um resgate por semana/tier.
- Editor de objetivos de operação no ADM, sem editar SQL.
- UI dentro da aba Universo, sem loops ou polling no Canvas.

## Não afirmar como concluído
- O motor de combate em tempo real NÃO aplica os atributos propostos pelos módulos (combat_enabled=false).
- Não há boss de raid de mundo aberto nem captura territorial nesta entrega.
- Essa entrega é uma fundação segura das V42.2/V42.3, não a conclusão das fases de todo roadmap.

## Verificações necessárias em ambiente real
1. Backup de saves e banco antes da migração.
2. SQL da fase 1 aplicado com sucesso.
3. Instalador Universal conclui npm run check e npm test.
4. Jogo login, Universo, Forja, equipar/desquipar em conf 1 e 2, histórico pós reload.
5. Objetivos do esquadrão: sem grupo, grupo com 4, resgate duplicado, reinício semanal.
6. Telemetria do Render e FPS mobile comparados com a V42.1.

## Especificação do segundo ZIP
O segundo ZIP terá como pré-requisito V42.3.0. Para concluir as etapas de novos mapas,
batalhas PvP em tempo real e comércio, será preciso acoplar ao motor do mundo, às regras
multiplayer e ao save do jogo. Não basta instalar novas tabelas SQL ou uma interface mockada.
