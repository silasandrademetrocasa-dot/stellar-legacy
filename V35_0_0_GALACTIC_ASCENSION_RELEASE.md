# Stellar Legacy V35.0.0 — Galactic Ascension (única entrega)

## Importante
Release candidata para teste integrado. **Não atualizar produção nem aplicar SQL antes do ZIP estar LIVE no Render.** O SQL é necessário para a nova progressão estrutural do relé. O rollback está no pacote. Relés, créditos, clãs e saves anteriores não são apagados.

## Fases integradas
- **35.1 Economia:** evolução do relé debitada no SQL (cofre + ligas de casco + núcleos de escudo) com custos ADM e logs; lojas, leilão, craft existentes mantidos.
- **35.2 Missões e temporada:** botão de resgate de peças fica indisponível durante a requisição, com nova validação local de progresso e checagem definitiva no banco; Passe de temporada existente mantido.
- **35.3 Fortificações:** estágios estruturais LV1–LV3 diferentes dos módulos (que continuam LV1–LV3 em oito slots). Valores iniciais editáveis no ADM: LV1 +0, LV2 +250k HP/+250k escudo, LV3 +750k HP/+750k escudo. Custos LV2: 2M CR +12 ligas +12 núcleos; LV3: 5M CR +25 ligas +25 núcleos; clã mínimo LV3/LV5. Base dos relés permanece conforme SQL atual: 500k/500k. Upgrades não curam em combate. Progressão da estrutura acompanha o posto territorial, sem apagar o inventário do antigo clã.
- **35.4 Galactic Warfare:** WebSocket difunde nível estrutural junto ao estado do relé; dano continua baseado nos equipamentos da nave e validado pelo servidor. Sem resets de PvP, configurações de escudo, AUX ou drones.
- **35.5 Universo e eventos:** cinco eventos rotativos de fim de semana e regras personalizadas preservados. Relé LV2/LV3 ganha silhueta e dimensões diferenciadas nas batalhas.
- **35.6 Segurança e ADM:** autorização SQL do líder para compra, transação com lock e auditoria, conferência de nível do clã e permissões; controles ADM dos custos e bônus estruturais com status visual.
- **35.7 Estabilidade:** efeitos vetoriais escalonados pelo nível gráfico, sem sombras/gradientes adicionais no modo baixo; proteção contra duplo resgate; testes de regressão e integridade.

## Instalação única
1. Suba **somente o ZIP completo** pelo Instalador Universal do GitHub. Não copie/remova a pasta `.github` do repositório.
2. Aguarde o Render ficar LIVE com package.json version 35.0.0.
3. Só então aplicar `sql/V35_0_0_GALACTIC_ASCENSION_FORTIFICATIONS.sql` no Supabase uma única vez, sob autorização.
4. Conferir as 9 fortificações LV1, configurar LV2/LV3 no ADM e comprar melhorias apenas com o clã legítimo.
5. Teste com dois pilotos; combate PvP, cooldown, bloqueio de itens insuficientes, save reload, desempenho com munições aberto, eventos de fim de semana.

### Avisos
- Os preços estruturais são iniciais e novos, **não alteram** o custo dos módulos já configurados (100k/1M/3M).
- Nenhuma compra de Premium/loja externa é acionada por testes.
- Não apagar as tabelas de auditoria no rollback. O rollback restaura a recomputação antiga; antes de executar rollback em produção, avaliar os tiers comprados após a migração.
