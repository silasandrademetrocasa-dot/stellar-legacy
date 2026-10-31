STELLAR LEGACY V106.8D - ISOLAMENTO CONTROLADO DO SISTEMA DE MISSOES V108

ORIGEM: aplicar SOBRE V106.8C (Universo V42 OFF) publicada no Render.
OBJETIVO: diagnosticar se a integracao da V106.8 (missao sem rollback) causa o travamento do login.

DESATIVADO TEMPORARIAMENTE:
- Import e callbacks de ACK de recompensas de missoes V108 no cliente.
- Guard V108 de continuidade de missoes no caminho de gravacao do servidor.
- Conclusao automatica/recebimento de premio de missao no cliente DURANTE O TESTE.
- Aceite de novas missoes no cliente DURANTE O TESTE.

PRESERVADO:
- Login, saves oficiais, combate, NPCs, XP, creditos, STL, inventario e hangar.
- Validacoes de revisao NPC, elite, economia, equipamento e banco.
- Universo Estelar V42 segue OFF. Shared Universe, mapas U-X e multiplayer NAO sao desligados.
- V106.8B bootstrap e verificacao de farm preservados.

TESTAR: basta tentar ENTRAR pela Web; NAO completar missoes ou jogar por horas nesta versao.
Se abrir: a nova integracao V108 esta fortemente envolvida, comparar imports e bootstrap com V106.7.
Se nao abrir: a V108 deixa de ser causa suficiente e a proxima camada e carregamento de modulo, auth e overlay.

NAO EXECUTAR SQL. NAO ALTERA SALDOS OU PROGRESSO.
REVERTER: repor os arquivos game.js, index.html e server/index.js da V106.8C, e o teste v108 antigo.
ESTE PACOTE NAO E UMA CORRECAO DEFINITIVA DE MISSOES. E UM A/B DE DIAGNOSTICO.
