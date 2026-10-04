# SQL atual do Stellar Legacy

`CURRENT_BACKEND.sql` é a referência consolidada do backend atual. As migrations antigas continuam preservadas no histórico do Git e não precisam viajar em cada ZIP de release.

O jogo em produção usa o projeto Supabase já migrado; este arquivo serve como snapshot técnico de referência.

## V16.3.0
`V16_3_DRONE_DESIGNERS.sql` adiciona/fecha o fluxo de designers de drone, sets 8/8 e claims idempotentes de Nexus/Eclipse.
