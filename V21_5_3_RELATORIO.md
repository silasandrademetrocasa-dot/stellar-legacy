# Atualização de navegação e escala de mapas

## Principais ajustes
- **Câmera:** acompanha o piloto e mantém atraso residual radial de no máximo 14 unidades. Funciona com FPS reduzidos; também no respawn/reparo.
- **Sprite:** removidas transformações de *shear* (inclinação não proporcional) e escalas X/Y diferentes de naves locais e remotas. O sprite continua rotacionando, sem deformar.
- **Mapa PvP:** 4-1: 9800×7000 → 11800×8400; 4-2: 10400×7400 → 12500×8900; 4-3: 11200×8000 → 13500×9600. Posições de portais estáticos ajustadas proporcionalmente; portais dinâmicos continuam obedecendo o grafo.
- **Viagem:** fator 0,88 para deslocamento nos três mapas PvP. PvE, habilidades, recompensas, itens e progressão mantidos. Diferença proporcional entre CONF de velocidade e de escudos preservada.
- **Banco:** migração SQL contida em `sql/V21_5_3_CAMERA_MAPA_BALANCEADO.sql`; não altera capturas A/B/C, saves nem jogadores. Runtime é notificado pelo trigger existente.

## Testes antes do deploy
Validar chegada aos pontos A/B/C no mesmo lugar relativo do mapa, nave centralizada enquanto acelera na CONF de corrida, precisão do clique/touch, portals, minimapa, nomes de pilotos e troca de configurações.

## Observação
Mapas crescem mantendo a posição salva absoluta dos jogadores e os relés reposicionados em seus percentuais do mapa. Após atualizar o World Runtime, reiniciar o serviço Render para garantir todas as salas com novas dimensões. Não publicar código e banco em versões divergentes por tempo prolongado.
