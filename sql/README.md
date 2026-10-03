# SQL atual do Stellar Legacy

`CURRENT_BACKEND.sql` é a referência consolidada do backend atual. As migrations antigas continuam preservadas no histórico do Git e não precisam viajar em cada ZIP de release.

O jogo em produção usa o projeto Supabase já migrado; este arquivo serve como snapshot técnico de referência.

## V13.2.0 — EVENT DOMINATION
Execute `V13_2_EVENT_DOMINATION.sql` após o backend V13.1. Os mapas 4-1/4-2/4-3 são event-only no cliente e o backend passa a controlar rotação de eventos, placar de influência e domínio dos clãs.
