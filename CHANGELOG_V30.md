# Linha V30 — Histórico conciso

- **V30.0.0**: sprites de nave com 16 orientações.
- **V30.0.1**: drones direcionais.
- **V30.0.2**: NPCs e bosses direcionais.
- **V30.0.3**: designers mantidos via efeitos existentes.
- **V30.0.4**: integração inicial, 353 testes regressivos aprovados antes da limpeza.
- **V30.0.5**: ZIP reduzido; texturas compactadas, duplicatas deduplicadas, documentação e 63 arquivos de teste históricos enviados para backup à parte; teste mínimo de produção mantido.

Nota: esta revisão é de compactação e limpeza, não inclui alterações em combate, economia ou SQL.

- **V30.0.6**: corrigida orientação real dos sprites; atlas reconstruídos a partir de uma única frente de cada modelo, 16 ângulos matemáticos, NPCs mirando na direção correta, drones alinhados ao movimento e testes cardeais.

- **V30.1.0**: players 32 directions, calibrated north and clockwise.

- **V30.1.1**: players plus drones and AUX 32 directions.

- **V30.1.2**: bosses 32 directions; common NPCs remain 16.

- **V30.3.0**: barra de munição mais fina no dock inferior, remoção dos botões visuais de LASER/CTRL e MÍSSIL/ESPAÇO, remoção do contador “MÍSSIL PRONTO” e redução do espaço vertical ocupado pela HUD de armas.

- **V30.3.0**: presets locais PVE/PVP/FARM/BOSS por nave, aplicação sem criar itens, mantendo escudo e HP; cópia de configurações preserva o escudo armazenado do destino; interface compacta no hangar.

- **V30.4.0**: proteção contra travamento do loop principal (rAF agendado em finally) e isolamento de falhas do painel de presets, preservando combate e progresso. Registro de erro local sem telemetria externa.

- **V30.4.0**: Hangar Pro com previsão de itens disponíveis e indisponíveis para presets, confirmação segura quando faltam itens, exclusão de presets e comparação de atributos das naves. Sem mudança de dano ou SQL.
