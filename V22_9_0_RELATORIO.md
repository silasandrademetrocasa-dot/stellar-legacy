# Stellar Legacy — relatório técnico V22.9.0

## Implementado e testado
- Coleta de minérios nos mapas online passa a aguardar confirmação do PostgreSQL antes de creditar a carga. O servidor verifica posição, recurso, quantidade e instância da sala.
- Ledger `stellar_ore_reward_ledger` com UNIQUE (user_id, ore_key), RLS e RPC concedida apenas ao service_role, protegendo contra repetição de coletas e duplo crédito.
- Revisão `serverOreRevision` monotônica e guardada no Supabase. Saves antigos são rejeitados e orientados a sincronizar.
- Resgates já confirmados de Passe Free/Premium e recompensas de nível não podem reaparecer mediante restauração de save antigo na mesma temporada.
- Correções de mensagens de falha de persistência e de validação de comprovantes.
- Mantidos saves, CR/STL por NPC online, guerra, clãs, eventos, gráficos e configurações.

## Limites que precisam ficar claros
- **A V22.9 NÃO conclui autoridade total da economia**: resgates de Passe e recompensas de missão continuam calculados em fluxos legados do cliente, e a verificação de progresso precisa ser migrada para eventos assinados/registrados no servidor. O guard atual evita rollback dos resgates, não criação arbitrária de pontos.
- Boxes de NPC ainda geram recursos por código local; devem migrar para recibos de coleta. XP e dano não são integralmente reconstituídos com loadout do servidor. Os NPCs online e suas recompensas CR/STL já têm recibos autoritativos desde V22.8.
- Capacidades de carga dependem de modificadores de nave; a nova coleta online confirma quantidade e origem, mas a validação definitiva de capacidade deve ser feita pelo servidor.
- Ainda NÃO habilitar pagamentos reais (Play Billing) até auditoria dos fluxos legados, testes reais de recompensas e validação do ciclo de compra/reembolso.

## Segurança de implantação
- SQL pode ser aplicado antes da instalação do ZIP, pois não altera o comportamento do código antigo; o gatilho para `serverOreRevision` aceita saves legados sem esse campo.
- Deploy via GitHub Actions do ZIP completo. Confirmar logs Render, testar X-1 mineração 2x, login reconexão e F5.
- Se houver erro de banco, recurso deve continuar no setor (sem desaparecer sem pagamento). O cliente mostra erro e permite tentar novamente.
