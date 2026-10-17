# Relatório técnico — Entrega unificada até V22.0.0

## Desenvolvimento por fases

- **21.6 — Temporadas competitivas:** banco para temporadas e resgates, ranking real derivado de `stellar_war_actions`, pontos 10 por captura/3 por defesa, cálculo de posição, datas imutáveis após início, limites administrativos, encerramento sem reset dos relés.
- **21.7 — Elite:** títulos conquistados validados contra `stellar_elite_claims` e equipáveis por RPC com `auth.uid()`, persistência do título escolhido; não altera contadores legados.
- **21.8 — Operações do Universo:** agenda de avisos e anúncios por mapa com janela de validade e categorias; **não implementa novos NPCs, ondas, chefe inédito nem loot**.
- **21.9 — Clãs:** ranking de contribuição sazonal por `clan_id` registrado no momento da conquista/defesa, sem transferir pontuação retroativa após troca de clã. Novas missões coletivas premiadas ficam para implementação posterior.
- **22.0 — Motor:** módulo independente para API de campeonato, regras puras isoladas, módulo de UI, PWA cache atualizado, release checks e testes adicionais. O `game.js` principal não foi totalmente modularizado.

## Segurança e persistência

- Tabelas aditivas com RLS e escrita restrita a `service_role`.
- Prêmio de temporada: RPC SECURITY DEFINER verifica `auth.uid()`, temporada encerrada, ranking oriundo exclusivamente de ações salvas pelo servidor, salva CR/STL sob `FOR UPDATE` e barreira `serverEliteRevision`; PK por usuário/temporada bloqueia segundo resgate.
- O cliente nunca envia pontos de temporada nem define vencedor.
- Títulos: RPC só admite objetivos que constam em `stellar_elite_claims` do próprio jogador.
- A/B/C, saves, combate, dano e CONF 1/2 sem mudança de esquema ou mecânica nesta entrega.
- Nenhuma temporada/alerta foi ativado automaticamente após migrar.

## Migrações já executadas

1. `stellar_v22_0_0_competitive_elite_world`
2. `stellar_v22_0_1_elite_title_selection`

O rollback de código não implica desinstalar tabelas, já que são aditivas.

## Testes

Testes automatizados com Node, validação de sintaxe, HTML e referências de sprites. A execução real no Android/Render com jogadores simultâneos deve ser validada depois do deploy.
