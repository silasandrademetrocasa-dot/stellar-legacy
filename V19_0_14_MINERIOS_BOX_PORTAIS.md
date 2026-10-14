# Stellar Legacy V19.0.14 — Minérios, boxes e portais

- Recursos normais nos mapas: apenas Ferron (Prometium), Cryon (Endurium), Virel (Terbium). Eventos mantêm seus recursos temporários próprios.
- Battle 4-1, 4-2, 4-3: `ore_count=0` online; sem criação involuntária de 72 pedras no carregamento. Os NPCs comuns continuam desligados.
- X-5, X-6, X-7, X-8: 20 BOX BÔNUS por mapa, igual X-1 a X-4, com respawn padrão e salvamento individual.
- X-5 a X-8 estão configurados em 20 BOX no Supabase e na configuração padrão. A antiga função ADM de edição de BOX continua editando X-1..X-4 e 4-X; os mapas altos mantêm 20 (a função legada ainda descarta campos novos ao salvar).
- X-8: portal de retorno deslocado para a outra lateral do mapa, afastado da base, com coordenadas idênticas na nave e na validação do servidor.
- Rotas, invasões bloqueadas em territórios estrangeiros e Battle 4-X público (nível 15) preservados.

Instalação: subir o ZIP completo no instalador principal original; SQL de minérios e bônus foi aplicado diretamente no Supabase. Não execute migração duas vezes.
