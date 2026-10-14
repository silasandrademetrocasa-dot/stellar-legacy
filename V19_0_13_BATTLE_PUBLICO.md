# Stellar Legacy V19.0.13 — 4-X PvP público interfacções

- 4-1 (b41), 4-2 (b42), 4-3 (b43) disponíveis para Terra, Marte e Júpiter, desde que atinjam **nível 15** (nível mínimo editável pelo ADM/Supabase).
- O mapa estelar mostra os três nós 4-X a todos os pilotos. O salto pelo mapa exige bônus para usuários comuns, enquanto os portais físicos não consomem bônus.
- Portais físicos entre as três arenas 4-X funcionam para qualquer facção, com validação de nível pelo cliente e pelo servidor.
- Todas as arenas 4-X compartilham sala de combate PvP por mapa (battle:b41,b42,b43).
- X-1 a X-8 mantêm restrição territorial — inclusive os caminhos 4-X → X-5 de outras facções. Cada piloto pode seguir somente para os mapas altos da própria facção.
- ADM continua sem restrição de nível/facção e sem custo de bônus de salto.
- Segurança: autorização no WebSocket usa nível/facção/role do save e banco, sem confiar no nível enviado pelo cliente.
- Sem migração SQL adicional.
- ZIP completo preserva instaladores existentes, todos os assets e a V19.0.12.
