# AUDIT V16.7.9 — HANGAR EQUIPMENT COMMAND

## Entregas
- Filtros de equipamento: lasers, escudos, motores e extras.
- Layout em dois painéis: equipamentos instalados e inventário.
- Seções recolhíveis com estado persistido no navegador.
- NAVE, DRONES e AUX-9 usam o mesmo padrão visual de gerenciamento.
- Slots de nave, drones e AUX-9 são compactados após remoção. Se o slot 3 for removido de uma nave com 15 armas, os itens seguintes avançam e o slot 15 fica vazio.
- Inventário permite equipar diretamente na Nave, Drone ou AUX-9 quando o item for compatível.

## Segurança / backend
Nenhuma migration nova de Supabase necessária.
