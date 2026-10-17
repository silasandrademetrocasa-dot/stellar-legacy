# Stellar Legacy — Atualização de navegação PvE

## Entrega
- Mapas X-1 a X-8 aumentados aproximadamente 20% em cada dimensão para valorizar exploração e trajetos.
- Multiplicador de velocidade 0,88 nos mapas X-1 a X-8, com relação entre CONF 1 e CONF 2 intacta.
- Câmera centralizada e sprites sem distorção da V21.5.3 mantidos em todos os mapas.
- Portais estáticos do fallback reposicionados proporcionalmente; grafo de portais online utiliza posicionamento proporcional às dimensões do mundo.
- Arenas PvP 4-X sem mudanças adicionais. Portais especiais Aurora, Nexus e Eclipse excluídos deliberadamente.
- Salvos, progresso de NPCs, missões, clãs, A/B/C, economia e equipamentos intactos.
- Banco: `sql/V21_5_4_EQUILIBRIO_MAPAS_PVE.sql`, aplicação protegida por dimensões esperadas.

## Teste recomendado
Fazer viagem completa X-1/X-4/X-8 com CONF de corrida e voltar após relogar; verificar que portais continuam no lugar correto, minimapa, NPCs, FPS e distância de viagem. O banco deve ser verificado após aplicar a migração. Futuros ajustes específicos de densidade de NPCs e dificuldade podem ser feitos pelo ADM sem reequilibrar as velocidades dos equipamentos.
