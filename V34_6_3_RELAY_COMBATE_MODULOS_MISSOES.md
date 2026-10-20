# STELLAR LEGACY 34.6.3 — COMBATE REAL, MODULOS E MISSOES DO CLA

## Alteracoes

- Ataque aos reles: combate validado no servidor a partir do loadout salvo da nave, lasers na nave/drones, lasers no AUX, municao e bonus de habilidade de ataque do piloto. Tiros de misseis verificam estoque salvo. Cliente nao determina dano por parametro arbitrario. Amunicao laser e descontada ao atacar o rele.
- Nave gira para o rele selecionado, feixe laser e efeitos de misseis apontam para o alvo.
- O dano das torretas LASER / MISSEIS vem de tabela por tipo e nivel, configuravel pelo ADM, com limites e cadencias independentes.
- Configuracao individual de 36 combinacoes (12 tipos de modulo x 3 niveis) de dano, cadencia, escudo, HP, bonus, custo em pecas, creditos do cofre, e nivel minimo do cla. O servidor valida todos os gastos.
- Upgrade: confirmacao no mesmo modal usado nas compras/vendas, com custos atualizados vindos do banco; custo de fabricar muda quando o atributo selecionado muda.
- Missoes: mostra progresso semanal da fonte do banco, desabilita recompensa ate concluir a meta, destaca em laranja quando disponivel e mostra RESGATADO apos claim. A funcao de resgate anterior no Supabase continua validando criterios e concedendo pecas.

## Como instalar

1. Enviar o ZIP completo usando o Instalador Universal no GitHub. Aguarde Render LIVE e confirme a versao 34.6.3 no package.json. A pasta .github foi excluida do ZIP para manter o instalador atual.
2. Depois do deploy, aplicar no Supabase `sql/V34_6_3_RELAY_COMBAT_BALANCE_MISSIONS.sql` (NÃO foi aplicada durante a montagem do ZIP). A versao anterior do jogo opera ate a migracao, mas o ADM e o upgrade da nova versao so liberam a tabela apos o SQL.
3. Validar: duas contas nos mapas PvP, tiro laser/missil no rele com loadouts distintos; orientacao da nave; ataques das torretas; missoes com progresso real; fabricante e upgrade em clã com pecas; campos do ADM e bonus.

## Seguranca

- Nao altera saves, niveis dos modulos existentes, inventario, reivindicacoes, posicoes de reles, recompensa ou cofre do cla na instalacao.
- Valores de dano de torreta e precos configuraveis no ADM, mas gravacoes passam por autorizacao e limites no servidor.
- Dano contra reles nao deriva de um campo de dano enviado pelo navegador, mas da configuracao salva do piloto. A precisao total com todos os designers/efeitos de tempo limitado ainda exige testes reais para validar paridade com o PvE.
- Regressao automatizada: 187 testes aprovados, sem substituir instalador .github e sem SQL automatico.

## Reversao

`sql/V34_6_3_RELAY_COMBAT_BALANCE_ROLLBACK.sql` restaura as funcoes da V34.6.2; preserva a tabela nova para nao perder ajustes, devendo reverter tambem o codigo do jogo antes de usar o rollback.
