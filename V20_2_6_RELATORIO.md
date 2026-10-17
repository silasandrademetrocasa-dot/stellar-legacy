# Stellar Legacy V20.2.6 — NPC / FPS: diagnóstico da causa raiz

## Contexto
O usuário relatou 12 FPS na V20.2.2, 14 FPS na V20.2.3 e perto de 14 FPS após testar a V20.2.5 no modo BAIXO. As melhorias anteriores não demonstraram avanço adicional; não sabemos se o gargalo é simulação, Canvas/GPU, tarefas de rede, JavaScript assíncrono ou capacidade do telefone.

## Mudanças
- `public/modules/npc-render-detail.js`: classifica o nível de detalhe visual por qualidade e distância quadrática, sem acesso a login/save ou estado de combate.
- `public/game.js` / `drawEnemy`: usa sprite original sem efeitos de deformação/banking/pulsação no modo BAIXO; indicadores de NPCs comuns distantes ficam progressivamente mais leves; chefes, eventos e alvo selecionado mantêm tudo.
- `public/modules/performance-monitor.js`: mantém a amostragem anterior (até 240 quadros) e acrescenta `updateP95Ms` e `drawP95Ms`, calculados somente se as etapas forem fornecidas. `record` com três argumentos continua válido.
- No loop: mede `update(dt)` e `draw()` separadamente apenas quando diagnóstico está ligado. A sequência é preservada, com `requestAnimationFrame` e monitor automático iguais.
- A apresentação e exportação local mostram os dois tempos; coleta desativada por padrão, sem telemetria nova de conta.

## Proteções
- O NPC não é removido do mundo nem da IA; lógica de movimento, dano, cooldown, loot, spawn, escudo, PvP, troca CONF1/CONF2, save e SQL não foram alterados.
- Naves do jogador e outros pilotos, AUX-9, drones e assets gráficos originais preservados.
- A qualidade MÉDIA/ALTA segue renderização anterior.
- Nenhuma chamada remota foi executada; deve ser testado no dispositivo após o deploy voluntário.

## Validação
- `npm run verify`: **164/164 testes**, 45 arquivos JS com sintaxe válida, 216 assets referenciados existentes, versão 20.2.6 uniforme, deploy Render configurado para verificar release.
- Comparação SHA entre V20.2.5 e V20.2.6: SQL, sprites, servidor (exceto etiqueta da versão), módulos de combate e demais arquivos de produção não modificados.
- Sem benchmarks reais de FPS/GPU/CPU; P95 JS de update e draw mede execução síncrona JS, mas **não mede trabalho de GPU concluído, tarefas fora do loop ou sobrecarga do sistema operacional**.

## Próxima decisão
- Se `drawP95Ms` for muito maior que `updateP95Ms`, priorizar renderização Canvas e quantidade de objetos/sprites visíveis.
- Se `updateP95Ms` for muito maior, investigar IA, sincronização e HUD/simulação.
- Se ambos forem baixos em relação ao intervalo dos quadros, investigar composição GPU, resolução efetiva/DPR, limite do telefone/navegador e tarefas assíncronas; não reduzir gameplay às cegas.
