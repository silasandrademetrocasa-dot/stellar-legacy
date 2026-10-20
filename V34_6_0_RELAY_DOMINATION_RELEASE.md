# STELLAR LEGACY V34.6.0 — RELAY DOMINATION & CLAN WARFARE

## Entrega consolidada

- **PvP com estrutura destrutível** nos relés A/B/C dos mapas 4-1, 4-2 e 4-3. Ataques contra os relés passam pelo websocket autenticado, recebem dano fixado no servidor, atingem escudo antes do casco e são confirmados no Supabase. Após a destruição, o atacante precisa permanecer na zona de conquista (8 s padrão, disputas interrompem a contagem).
- **Visual atualizado** no mapa, com estação pseudo-isométrica desenhada no Canvas, oito encaixes visíveis, barras circulares de escudo e HP, cor da facção e efeitos leves. A visualização do combate e o disparo automático ficam no painel WARFRONT.
- **Propriedade por clã e facção** em nove relés, com mudança atômica de domínio, proteção de 90 s e pontuação de guerra. Conquista disponível 24/7 e multiplicador de pontuação de guerra no sábado/domingo (padrão 1,2x); não altera o cronograma dos eventos V34.5.
- **8 módulos por relé:** 2 armas (slots 1–2), 2 escudos (3–4), 2 HP (5–6), 2 bônus (7–8). O banco impede dois módulos de bônus com o MESMO atributo no MESMO relé. Dano + HP é válido, dano + dano é proibido. Os módulos equipados são devolvidos ao inventário de seu clã quando um rival captura o relé.
- **Oficina de clãs e evolução:** módulo nível 1 = 5 peças, 0 CR, clã nível 1; nível 2 = 12 peças, 100.000 CR, clã nível 3; nível 3 = 25 peças, 350.000 CR, clã nível 5. Custos do cofre e peças do clã são debitados em função transacional no Supabase, somente pelo líder.
- **Missões coletivas semanais:** capturar 2 relés, defender 3 vezes, matar 100 NPCs online, conquistar 5 relés. Cada missão paga 5 peças da categoria associada ao clã, uma vez por semana, com verificação de conquistas e abates confirmados no servidor.
- **Bônus equilibrados, sem acumular:** um mesmo clã com A/B/C de um mapa recebe o **melhor único módulo bônus** de seus relés em TODOS os mapas. Se a mesma facção dominar os NOVE pontos, cada piloto da facção recebe o **melhor único módulo bônus** dentre os relés. Se ambos se aplicarem, continua valendo um único bônus mais forte; o bônus não soma atributos ou módulos repetidos. Bônus de recursos em mineração online é aplicado pelo servidor; os atributos da nave e XP são exibidos/recalculados no cliente.
- **Torretas e reparação:** armas instaladas disparam contra jogadores de outros clãs no alcance, com recarga limitada. Clã dominante pode reparar o relé após 15 segundos sem ataque, gastando 3.000 créditos do cofre por reparação.
- **ADM de guerras:** controle de HP base, escudo e dano por ataque no WARFRONT; backend expõe também limites de recarga, tempo de captura, proteção, ativação e multiplicador de fins de semana.
- **Compatibilidade:** SQL de instalação e desativação incluídos. Até o SQL ser aplicado, o código novo usa o modo antigo de captura, evitando indisponibilidade durante a instalação. Saves, Premium, lojas, eventos, NPCs e recursos preexistentes não são apagados.

## Instalação importante — duas etapas

1. Subir **um único ZIP** pelo Instalador Universal no GitHub e aguardar Render com status **LIVE** e versão `34.6.0`.
2. **Somente após o Render ficar LIVE**, aplicar o arquivo `sql/V34_6_0_RELAY_DOMINATION.sql` no Supabase. Não é preciso aplicar o SQL de reversão em uma instalação normal. O usuário pode pedir ao ChatGPT que execute esta etapa após subir o ZIP.
3. Entrar com clã em 4-1 / 4-2 / 4-3 e testar disparos, HP/escudo, captura de 8 s, oficina, módulos, missões e bônus. Testar com duas contas reais de clãs distintos e verificar FPS.

## Plano de contingência

O arquivo `sql/V34_6_0_RELAY_DOMINATION_ROLLBACK.sql` **desativa o novo sistema sem apagar nenhuma tabela**. Para voltar à versão anterior por completo, desativar o recurso e restaurar também o código V34.5.0. O histórico de clãs, módulos e peças permanece no banco.

## Verificações efetuadas

`npm run verify`: **160/160 testes automatizados** de regressão, mecanismos de relés, validação de UUID, bônus, dominação, proibição de duplicação, serialização, persistência e sintaxe JavaScript. Os caminhos de sprites/assets foram conferidos. O ZIP é checado por integridade. O teste com jogadores reais em Render+Supabase deve ser feito após a instalação, pois o novo SQL **não foi executado em produção durante a preparação**.

## Limites de segurança

Não é permitida escrita direta pelo navegador nas novas tabelas. O banco confirma compras, consumo de peças, bônus de mineração, missões e posse. O servidor decide dano e intervalo contra o relé. O sistema PvP tradicional ainda utiliza alguns estados de nave tratados pelo cliente; esta versão não representa uma revisão completa anti-cheat do PvP existente.
