# Relatório técnico — V22.5.0

Base: Stellar Legacy V22.0.1, preservando os sistemas anteriores de combate, naves e WARFRONT.

### V22.1 — Estabilidade
- Releases com importações corretas, testes para ligação cliente/servidor, nomes de interface sem sufixos de versão e mensagens de falha das missões coletivas.

### V22.2 — Universo Dinâmico
- `server/universe-directives.js`: validação temporal/setorial/categoria das diretivas existentes no Supabase.
- `server/world.js`: uso do motor nativo de ondas, chefes e minérios para diretivas ativas; limpeza automática e prioridade dos eventos anteriores.
- Poll server-side de 20 segundos, sem API pública de criação de NPC nem novos prêmios programáveis.

### V22.3 — Clãs
- `server/clan-operations.js`: validação e apresentação dos objetivos coletivos.
- `server/command-center-router.js`: API autenticada, contagem por clã a partir de conquistas/defesas registradas no banco, criação ADM e resgate transacional, único e exclusivo do dono do clã.
- `sql/STELLAR_V22_5_0_CLAN_OPERATIONS_HALL.sql`: duas tabelas protegidas por RLS, três objetivos iniciais, função de recompensa ao cofre e índice de desempenho.

### V22.4 — Temporadas e Prestígio
- Arquivo de temporadas encerradas via view de segurança invoker, com facção vencedora calculada pelas ações verificadas do servidor.
- Mantidos títulos de Elite e resgates existentes sem redefinir pontuação ou territórios.

### V22.5 — Motor e escalabilidade
- Módulos dedicados de programação dinâmica e missões de clã.
- Poll intervalado, sem reiniciar salas, conflito controlado com eventos oficiais e correção automática após janela de programação.
- Testes de regressão para conteúdos adulterados, privilégios, pontuação e resgates.

### Banco
**Migração nova pendente de execução manual** em razão de bloqueio de conexão na preparação. Este relatório não afirma que ela foi aplicada. A SQL está incluída, e deve ser executada antes do deploy.

### Itens preservados
- Propriedade A/B/C, mapas PvE/PvP, velocidade nominal e ritmo de deslocamento V22.0.1, funcionalidades CONF 1/2, sprites e saves.

### Limitações
- Sem testes automáticos de alta concorrência ou multiplayer remoto nesta sessão; requer validação do Render.
