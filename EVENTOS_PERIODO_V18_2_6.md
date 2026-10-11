# Stellar Legacy V18.2.6 — Eventos por período

## Regra

O identificador do evento é `v1817:<tipo>:<início_da_janela_em_ms>` e **não** o nome do mapa. Toda atualização de progresso é individual e atômica por `(user_id, event_id)`, na tabela `galaxy_event_progress_v1826`.

### Abates

O servidor confirma a morte e somente credita o avanço aos jogadores elegíveis ao prêmio do NPC. O contador persiste no Supabase. Ele não é substituído pelos contadores coletivos enviados na mensagem de atualização da sala.

### Recursos

Quando o servidor confirma a coleta do minério de evento, soma a quantidade coletada ao mesmo registro pessoal, mesmo se houver mudança de mapa.

### Recompensa

Ao atingir a meta, o banco marca `rewarded=true` na mesma transação que entrega créditos, Stellarium, XP e núcleos, grava a marca no save e incrementa os saldos no perfil. Repetir o pedido não paga novamente.

### Ao recarregar / mudar de mapa

O servidor consulta o progresso pessoal e envia `event_personal_update`. Em caso de save antigo, a função de proteção `SAVE_EVENT_STALE` impede sobrescrever uma recompensa já registrada.

### Critério do período

O mesmo evento em uma janela futura gera novo `eventId` e pode ser completado novamente. A troca de sala no mesmo horário **não** gera evento novo.

### Instalação

A migração SQL já foi aplicada no Supabase antes da entrega. Instale somente o ZIP pelo fluxo GitHub/Render. Para configurar um Supabase novo, há cópia em `sql/V18_2_6_EVENTOS_POR_PERIODO.sql`.

### Validação

Foram testados em transação revertida: progresso parcial, retomada de coleta, prêmio único e bloqueio de save desatualizado. Verifique no Render após o deploy com duas contas e troca real de mapa.
