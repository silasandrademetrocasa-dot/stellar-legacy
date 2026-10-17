# Relatório técnico — Guerra de Facções

Implementado a partir da V21.4.0; contém todas as etapas planejadas para a expansão de Guerra num único pacote.

### Etapa 1 — Persistência e auditoria
Captura A/B/C mantém troca atômica no Supabase. Cada troca registra dono anterior, facção nova, mapa, ponto, piloto e timestamp no log de guerra. Nenhum reset automático de domínio.

### Etapa 2 — Benefícios territoriais
Créditos logísticos para pilotos cuja facção controla ao menos um ponto, com máximo diário, limite configurável, bloqueio de resgate duplicado e transação SQL com save versionado.

### Etapa 3 — Rankings e contribuição
Pontuação por conquista e defesa verificada pelo servidor, rankings por facção, piloto e clã. Filiação ao clã capturada no momento do evento (sem transferência retroativa).

### Etapa 4 — Campanhas, encerramento e prêmios
Agendamento com início/fim, pontuação por campanha, ranking encerrado calculado a partir de eventos históricos, resgate pós-encerramento no Supabase e proteção contra pagamentos duplicados. Domínios territoriais permanecem intactos ao encerrar.

### Etapa 5 — Administração visual e validação
Em Centro de Comando → Guerra: CRUD de campanhas com rascunhos e publicação, ajustes de pontuação e suprimentos, placar e histórico, campos visuais mobile, sem nomes de versão visíveis.

### Banco atualizado
- `stellar_v21_5_0_guerra_faccoes_completa`
- `stellar_v21_5_0b_clan_snapshot`
- V21.4.0 existente e preservada.

### Segurança
Recompensas e captura persistidas em funções SQL do servidor; tabelas RLS sem escrita direta de `anon`/`authenticated`; funções de escrita do mapa e defesa apenas para `service_role`. Resgates usam usuário autenticado e saves bloqueados na transação.

### Não alterado
IA/combate de NPCs, escudos, CONF1/CONF2, munições, inventário, sprites, versão anterior do instalador e os saves armazenados.

### Atenção
O banco está atualizado, mas a implantação e os testes de combate reais no Render dependem do deploy pelo instalador. A configuração de `SUPABASE_SERVICE_ROLE_KEY` precisa existir no Render; não houve verificação dessa variável nesta etapa.
