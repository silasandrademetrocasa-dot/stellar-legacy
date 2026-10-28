# Stellar Legacy V90 · cumulativa V86–V90

Base obrigatória: **V85 (47.7.41)**. Destino: **V90 (47.7.46)**.

- **V86** Farm Offline: consulta separada do saldo real confirmado no save do servidor, sem resgatar nem alterar dados. Os resultados projetados continuam separados da economia real.
- **V87** Autopilot: seleção estável do NPC dentro de tolerância de distância; limitador visual/operacional de tentativas de míssil por tick; ações normais continuam nos métodos oficiais. O loop astral V83 preservado.
- **V88** ADM: painel de auditoria de balanceamento de NPCs, spawns, mapas, missões e três gates; dados lidos apenas sob verificação ADM; gera alertas e indicador de pressão de Créditos em relação a HP+escudo, não altera valores.
- **V89** Missões: sete contratos especiais adicionais para setores avançados (X-5 a X-8, Nexus, Astral e Apex); IDs das missões existentes intocados; critérios dos mapas de desbloqueio alinhados à V81; Apex não sorteado em diária.
- **V90** Apex: aviso discreto quando um dos lendários do X-7 é selecionado e auditoria da exclusividade de dois spawns, sem novas partículas ou efeitos caros.

## Salvaguardas
- Não altera curva XP de 44 níveis, itens, moedas, saves, inventário ou perfil de jogador.
- Não modifica regras ou valores do Supabase neste patch; não é uma migração SQL.
- Nenhuma funcionalidade econômica foi movida para o cliente ou liberada durante Farm Offline.
- Não altera gráficos de relés, mapas, motor ou efeitos que melhoraram o FPS.
- Autopilot permanece dependente de acesso da conta, aba visível e confirmação dos gastos.
- O relatório de créditos por HP+escudo é um indicador de investigação, **não** uma medição comprovada de farm/hora.

## Checklist de aceitação no Android
1. V85 instalada, patch V90 aplicado, confirmar versão 47.7.46.
2. Farm Offline ativo: abrir Leilão, Hangar, Loja e Arena; conferir que a nave continua oculta e os cliques no mapa bloqueados. Consultar saldo real no painel Farm.
3. Bot de caça: selecionar NPC e conferir que não troca de alvo a cada tick; não usar o teste astral com saldo alto antes de conferir limites.
4. ADM > Balanceamento: consultar auditoria de configurações no servidor.
5. Missões especiais: conferir novos contratos apenas nos níveis/setores adequados; progresso das missões antigas intacto.
6. Selecionar Apex no X-7; texto de aviso discreto e desempenho semelhante ao V85.

## Rollback
O ZIP de rollback restaura somente **arquivos** de V85. Não modifica banco nem saves.
