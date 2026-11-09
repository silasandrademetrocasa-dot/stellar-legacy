# STELLAR LEGACY — V135.0 CUMULATIVA | 09/11/2026

**Base:** ZIP V134.2 enviado pelo autor. **Versão:** 47.7.67.

## Conteúdo implementado

1. **U-X:** substituídos 8 PNGs com contaminação visual em 8 sprites WebP recortados, transparentes, no diretório `public/assets/v135/npcs/`; o catálogo usa os novos caminhos. Conteúdo e IDs de NPCs permanecem os mesmos.
2. **Arena quinzenal:** placar da temporada usa apenas batalhas a partir do novo período. Reset automático a cada 14 dias na virada de domingo/segunda às 00h de São Paulo; início 09/11/2026. A contagem vitalícia continua guardada. Conta ADM não disputa classificação. Top 1 = Imperador, Top 2 = Lenda, Top 3 = Elite, Top 4-10 = Gladiador. Títulos expiram 14 dias depois da premiação e podem ser equipados no Perfil do Piloto; ranqueamento e validade conferidos no servidor.
3. **Natal e semana:** ciclo ininterrupto de eventos 24h/7d: 3h evento normal + 1h Natal, caso Natal ativo, com rotação de invasão, Prime, mineração, comboio e batalha. Festival Natalino contínuo de 16/11 a 22/11/2026 (horário de São Paulo), com cenários alternados. Eventos únicos e intervenção manual da administração mantêm precedência. Eventos são decididos pelo relógio do servidor.
4. **PvP:** impedir spawns e respawns de NPCs comuns em B41, B42 e B43; apenas NPCs de evento ativo. Ao aplicar configuração de NPC, NPCs normais remanescentes nesses mapas são expurgados.
5. **Designers:** desativados os 31 designers antigos de nave no banco e ocultados no cliente. Permanecem 7 designers especiais; designers de AUX/drones e inventários históricos preservados.
6. **World Boss:** nova RPC `stellar_player_claim_world_boss_v135()` registra o resgate e a concessão de recursos/fragmentos/cores no mesmo commit do PostgreSQL. Se falhar o save, a transação inteira é revertida. O cliente não credita mais valores antes do ACK.
7. **Blueprints e Mastery:** agora usam `/api/player/warfront/action` e `stellar_player_commit`, com operação idempotente, validação de saldo no servidor, hash da intenção e resposta com save canônico.
8. **Arena diária:** a RPC agora devolve o save completo. O cliente aplica o snapshot canônico e não apaga `cloudDirty` após uma atualização parcial de créditos/XP/nível.

## Migrations

As migrações dos arquivos `sql/STELLAR_V135_ARENA_QUINZENAL_DESIGNERS.sql` e `sql/STELLAR_V135_WORLDBOSS_ATOMICO.sql` **já foram aplicadas** ao projeto `stellar-legacy` do Supabase em 08/11/2026 (horário de São Paulo). Não execute novamente sem avaliar o histórico de migrações do projeto.

## Instalação

- **ZIP completo:** substitua o projeto pelo conteúdo preservando suas variáveis de ambiente e secrets existentes. Não copie `node_modules`.
- **ZIP de atualização:** extraia sobre o repositório **V134.2 original** e substitua arquivos homônimos. Depois faça commit/push. Não é um jogo standalone.
- O GitHub/Render **não receberam** o novo código automaticamente nesta entrega; subir o ZIP/patch ao seu repositório é necessário para ativar o servidor de eventos, sprites e menus novos. Os novos SQL já estão presentes.
- Versão web requer Node >= 18, Supabase e os segredos de servidor existentes. Workflow APK em `.github/workflows/` mantido.

## Validação

- `npm run check`: aprovado (351 JS, 310 assets, 199 caminhos JS, sem caminhos faltantes).
- Testes de calendário contínuo V135 e da forja/mastery V135: 8 aprovados.
- Suite histórica: 623 testes executáveis aprovados; 1 módulo `tests/v134-transactions.test.mjs` **não executado** porque a dependência `@electric-sql/pglite` não estava instalada e a instalação não concluiu neste ambiente.
- Supabase: as RPCs existem, ranking foi consultado e 7 designers de nave ativos foram confirmados. **Não foi executado resgate real**, para evitar alterar recompensas de jogadores.

## Pendente de auditoria — não dar como concluído

Fluxos de recompensas locais dos Portais Astrais, respostas parciais de Guerra/Elite/temporada, reparo e recuperação de nave, sincronização de designers sob respostas concorrentes e testes em aparelho/PvP com dois usuários precisam de uma rodada adicional antes de declarar a economia inteira blindada.
