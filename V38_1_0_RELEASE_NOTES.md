# Stellar Legacy V38.1.0 — Astral Rewards

**Atualização única, incremental, sobre V38.0.0**. A V38.0.0 continua responsável por combate, mapas, minimapa e recompensas tradicionais. O novo sistema é um bônus de conclusão com prévia congelada, três recursos exclusivos, bônus semanal e concessão atômica no Supabase.

| Portal | CR adicional | STL adicional | Núcleos | Recurso exclusivo | 1ª conclusão semanal |
|---|---:|---:|---:|---|---:|
| Aurora | 2.500.000 | 1.500 | 15 | 6 Aurorium | +25% |
| Nexus | 6.000.000 | 3.500 | 35 | 12 Nexium | +30% |
| Eclipse | 15.000.000 | 8.000 | 75 | 25 Eclipsium | +40% |

Além disso, cada portal inclui munições, mísseis e Voidite. Os números da tabela são pontos de partida, antes do multiplicador calculado a partir das ondas efetivas e dos fatores `enemyScale` e `damageScale` da configuração V19.0.6. Escala limitada entre 0,5× e 3×.

O multiplicador semanal incide em CR, STL, Núcleos e no recurso exclusivo. O administrador altera os valores (e as munições/mísseis) na Central ADM, sem modificar código/SQL. Alterações posteriores não mudam a recompensa que o jogador travou na prévia antes da batalha. Histórico de até 20 resgates fica disponível no painel.

**Integridade:** registros únicos por jogador/portal/número da conclusão; SQL transacional com trava do save; função de concessão restrita ao serviço, nenhuma permissão de resgate direto ao cliente. A versão atual do combate continua local, portanto esse mecanismo impede duplicidade de resgate mas não comprova a legitimidade de todas as vitórias contra clientes adulterados.

**Instalação:** executar `sql/V38_1_0_ASTRAL_REWARDS.sql` antes do ZIP; depois enviar o ZIP à raiz e rodar o Instalador Universal. Não rodar SQL legado novamente. Backup recomendado. Testes em produção exigem contas de teste e devem confirmar saldos/sincronização antes de liberar a todos.
