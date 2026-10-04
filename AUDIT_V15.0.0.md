# Stellar Legacy V15.0.0 — SHARED UNIVERSE

## Arquitetura
- Render agora hospeda um World Server autoritativo via WebSocket (`/ws`).
- Supabase continua responsável por autenticação, sessão única, saves, perfis, clãs, premium, ranking e sistemas persistentes existentes.
- Mapas normais X-1/X-2/X-3/X-4 e BATTLE 4-1/4-2/4-3 usam estado compartilhado por sala.
- Portais Astrais continuam instâncias privadas por jogador.

## Mundo compartilhado
- NPCs são criados uma única vez no servidor por sala.
- Posição, movimento, HP, escudo, morte e respawn dos NPCs são sincronizados para todos os jogadores da mesma sala.
- Recursos/minérios são entidades globais: o primeiro jogador que coleta remove a mesma pedra para todos.
- Respawn de minério é decidido pelo servidor.
- Eventos Galácticos usam relógio do servidor, entidades compartilhadas e progresso compartilhado por sala.
- Invasão Rift, Anomalia Prime, Surto de Mineração, Comboio Quântico e Ruptura Warfront passam pelo World Server.

## Combate cooperativo
- Dano PVE é enviado ao servidor antes de alterar HP/escudo do NPC.
- Cada NPC registra contribuição de dano por user_id durante sua vida.
- Na morte, todos os contribuidores conectados recebem crédito de assistência proporcional à participação.
- O payload de morte já inclui `contributors`, preparando o backend para Grupos de Batalha/Party em versão futura.
- Ataques dos NPCs também são escolhidos pelo World Server, evitando duas simulações diferentes do mesmo alien.

## Segurança e consistência
- WebSocket exige access token + game_session_id válidos antes de entrar no universo.
- Distância de ataque e coleta é validada pelo servidor.
- Dano por mensagem é limitado pelo World Server.
- Em queda de conexão, o cliente NÃO cria NPC/minério local: o mundo congela e reconecta para evitar universos divergentes.
- O HUD do JOGADOR exibe status ONLINE/RECONECTANDO e ping do universo.

## Compatibilidade
- V14.1 Account Guard preservado.
- AUTO-COMBATE continua exclusivo PREMIUM/PASSE MENSAL.
- PVP entre jogadores continua usando a infraestrutura online existente.
- World Boss Warfront mantém HP global via backend existente e usa posição estática compartilhável nos mapas BATTLE da V15.
- Nenhuma migration SQL nova é obrigatória para V15.0.0.
