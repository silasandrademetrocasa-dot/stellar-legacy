# Relatório técnico — Segurança e Antifraude

## Escopo
- Análise do caminho de save completo em `/api/save` e rotas de compra com validação de preço no servidor.
- `server/security-guard.js`: valida entradas econômicas, progresso reservado, propriedades e estoques.
- `server/security-service.js`: registra incidentes com credencial `service_role` no Render sem exibi-la ao navegador.
- `server/index.js`: rotas de segurança administrativas, auditoria de tentativas suspeitas, proteção de compras e salvamento.
- `server/world.js`: tolerância de movimento, limitação de teleportes, logging não punitivo, reverificação de acesso multiplayer.
- `public/index.html`, `public/game.js`, `public/api.js`: painel de incidentes e revisão somente para ADM.
- SQL antifraude: tabela protegida por RLS, função de reporte restrita ao servidor, revisão pelo ADM, suspensão temporária por reincidência, gatilhos para saves e estoques.

## Segurança / limites
- Bloqueia quantidades inválidas e grandes saltos; mantém cálculos de loja do lado do servidor.
- Criticidade é determinada por sinais objetivos; avisos de movimentação não geram suspensão.
- Ban temporário de 24 horas após 3 registros críticos não revisados em até 2 horas, com janela de deduplicação de 1 minuto para o mesmo sinal.
- Incidentes contêm códigos e evidências técnicas reduzidas, não senhas, tokens, e-mails nem chaves privadas.
- ADM isento de autoban; atos administrativos permanecem sob verificação de role no Supabase.
- **Limitação**: recompensas legítimas computadas pelo cliente continuam requerendo migração para origem exclusivamente no servidor. O sistema não promete eliminar todo exploit.

## Verificação
- `npm run verify`: 274 testes aprovados, zero falhas.
- Migrações `stellar_v22_6_0_antifraude_auditoria_autoban` e `stellar_v22_6_1_inventory_guard` aplicadas no Supabase.
- Post-check: 6 saves existentes, 9 relés, 3 domínios, 3 ações de guerra e 3 missões coletivas preservadas.
- RLS: usuários anônimos e autenticados sem INSERT em `stellar_security_events`; somente `service_role` pode reportar.
- Teste de salvamento autenticado sem mudança, dentro de BEGIN/ROLLBACK, passou após criação dos gatilhos.
- Teste de reporte de aviso pelo `service_role`, seguido de ROLLBACK, passou sem criar incidentes nem banir jogador.
- Testes end-to-end no Render e checagens de antifraude contra ataques reais ainda pendentes de publicação e testes autorizados.
