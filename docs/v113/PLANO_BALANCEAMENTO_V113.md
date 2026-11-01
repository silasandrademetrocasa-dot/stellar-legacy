# Stellar Legacy — V113.0: Combate e progressão

Base da atualização: Web V112.0, modelo online 47.7.60. Banco Supabase `stellar-legacy`.

## Princípios
- As naves conservam suas funções originais: ataque, mobilidade, suporte e defesa. O rebalanceamento ajusta oito modelos iniciais/intermediários; não diminui slots nem retira equipamentos dos pilotos.
- Drone HALO mantém 1 slot e NOVA mantém 2. Os lasers/escudos aprimorados funcionam nesses slots sem alterar quantidade máxima nem criar itens.
- AUX-9: as cinco especializações antigas e as cinco famílias de protocolos permanecem intactas. O Nível I continua publicado e cobrado pelo Supabase (elite STL, Box/Porão em CR); custos de fabricação sobem para NII = 50 milhões CR, NIII = 180 milhões CR, com recursos adicionais. NIII segue exclusivo de U-1/U-2/U-3 e AUX nível 15.
- O Autopilot V112 e o Farm Offline V111.1 não foram tocados; somente novas simulações de Farm usam os NPCs já rebalanceados, porque snapshot antigo fica congelado no início da sessão.
- O balancing de NPCs é oficial no banco: recompensas continuam passando pelo servidor. Nenhuma recompensa é concedida ao abrir uma tela.

## Ajustes de progressão

| Categoria | Direção |
|---|---|
| Naves iniciais (Aurora/Pioneer/Raptor) | +HP, porão ou velocidade moderados |
| Naves intermediárias (Meridian/Bastion/Concord/Vanguard/Sovereign) | maior sobrevivência sem ultrapassar topo de elite |
| ARC-1 a ARC-4 | dano +1% a 9% conforme tier; modelos de evento inalterados |
| VSH-1 a VSH-3, AEG-1 | escudos iniciais +5% a 17%; modelos de evento inalterados |
| NPC avançado comum | +2% casco/escudo, -7% CR, -4% STL, +6% XP |
| Prime | +5% casco/escudo, +3% dano, +12% CR, +10% STL, +14% XP |
| Apex Overlord | +6% casco/escudo/dano, +28% CR, +20% STL, +25% XP |
| Missões diárias | missão de NPC normal 60, chefe 16, combos 32/6, minério 450; fator 0,62 |
| Missões semanais, mensais e especiais | fatores 0,90 / 1,10 / 1,28; regras e objetivos antigos preservados |
| Passe Novembro 2026 | 30 tiers × 450 pontos, até 700 pontos/dia com 7 desafios gratuitos (alvo mínimo ~19,3 dias) |
| Desafios diários do Passe | escalam suavemente depois do nível 15 até nível 44, sem exigir Premium ou AUX |

## Valores de comparação (CR, STL e XP por abatimento oficial)
- Obsidian Pike: 1.593.000 → 1.481.490 CR; 986 → 947 STL; 41.850 → 44.361 XP.
- Sentinel Support: 2.684.000 → 2.496.120 CR; 1.560 → 1.498 STL; 75.400 → 79.924 XP.
- Obsidian Pike Prime: 3.304.000 → 3.700.480 CR; 1.972 → 2.169 STL; 87.750 → 100.035 XP.
- Apex Overlord: 14.000.000 → 17.920.000 CR; 8.800 → 10.560 STL; 425.000 → 531.250 XP.

## Segurança / reversão
- A migração `sql/STELLAR_V113_BALANCEAMENTO_CUMULATIVO.sql` foi executada no Supabase e registrada. NÃO executar novamente na instalação; o comando é idempotente e incluído apenas para histórico.
- Valores anteriores em `public.stellar_v113_balance_backup`, tabela com RLS e sem concessões para `anon`/`authenticated`.
- Em incidente confirmado, seguir `sql/STELLAR_V113_ROLLBACK_MANUAL.sql` numa janela controlada, **não** no workflow automático. A reversão restaura atributos e regras catalogadas, mas jamais reverte pagamentos ou saves.
- O endpoint `GET /api/admin/v113/progression-audit` exige sessão e confirmação da role administrativa pelo Supabase e só consulta configurações. Os números são comparações de combate/tempo, não promessa de rendimento real por hora.

## Plano de homologação
1. Na nave inicial e numa intermediária, verificar HP e slots antes/depois de atualizar, sem perda de equipamento.
2. Equipar ARC-1 e VSH-1 em nave e drone; verificar mudança de dano/escudo, sem duplicar o bônus por slot.
3. Com AUX-9, conferir CONF1/CONF2, preço de fabricação NII (50M CR) e NIII (180M CR) e itens consumidos pelo servidor.
4. Comparar um NPC normal do X-6, um Prime e o Apex em tempo de luta e recompensa; testar com outro jogador próximo para validar o servidor.
5. Aceitar missões diárias/semanais/chefes; completar e verificar recompensas uma única vez.
6. No dia 1/nov, conferir que a temporada 2026-11 apresenta 450 pontos/tier e recompensas FREE/Premium corretas; realizar um tier real de teste.
7. Rodar Autopilot com orbit/coleta e Farm Offline, comparar relatório e saldo autoritativo (as sessões iniciadas antes do balanceamento mantêm snapshots antigos).
8. Painel ADM > Balanceamento ao Vivo > AUDITORIA V113: confirmar contagens, previsão de dias do Passe e alertas.

## Fora do escopo (necessita uma fase própria)
- Novo sistema de atributos individuais e níveis de experiência de cada drone.
- Reformulação de habilidades de todas as 43 naves e suas subclasses.
- Novo combate cooperativo PvP/Relés e eventos de chefes com fases inéditas.
- Recompensas históricas já resgatadas, rankings, moeda premium e preços de leilão não são alterados.
