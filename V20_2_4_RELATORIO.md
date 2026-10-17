# Stellar Legacy V20.2.4 — HUD MOBILE / DESEMPENHO

## Origem
Base integral: V20.2.3, sem descartar componentes de gameplay ou imagens. O usuário relatou cerca de **12 FPS no perfil BAIXA** num celular de entrada. Isso é uma medição informal; não é prova de um gargalo específico nem garantia de ganhos com esta atualização.

## Alterações técnicas

1. **Cadência independente do HUD** (`public/modules/hud-update-scheduler.js`):
   - BAIXA: valores críticos do combate no máximo ~140 ms entre atualizações, contadores de munição ~380 ms, HUD geral ~850 ms.
   - MÉDIA/ALTA: ~100 / ~300 / ~550 ms respectivamente.
   - `updateUI()` chamado diretamente em respostas a ações do usuário continua sem throttling; os relógios internos só são rearmados após atualização completa.
   - O ritmo do loop principal, simulação dos NPCs, cooldowns e disparos não mudou. Os intervalos são aproximados, dependentes da taxa efetiva de quadros.
2. **Layout do HUD** (`public/game.js`): coalescência de `requestAnimationFrame` em abrir/fechar painéis, nas ações em lote e no resize; mede toda geometria antes de escrever variáveis CSS. Valores iguais não são aplicados de novo.
3. **Rastreabilidade**: release, health check, import/cache-busting atualizados, testes adicionais e validação automática de imagens mantidos.

## Não alterado
Dano, escudo por configuração, regras de reparação, itens, preços, progresso, login, Supabase, SQL, PvP, NPCs, mapas e sprites. Nenhum dado de diagnóstico é enviado à rede por esta alteração.

## Validação local
- `npm run verify`: scripts, imports, assets e regressões locais.
- Resultado: **148/148 testes** (inclui seis novos testes do agendador), **39 arquivos JS** e **216 referências de sprites** verificados.
- Testes não substituem validação visual no navegador nem o teste em Android/Render.

## Teste comparativo sugerido (mesmo celular e mesmas condições)

1. V20.2.3 → CONF → JOGO → habilite diagnóstico, BAIXA, mesma resolução, mesmo setor e mesmo número de NPCs. Registre FPS, P95 e tempo de desenho.
2. Faça 2–3 minutos em repouso, movimento e combate; registre os valores de cada situação.
3. Instale V20.2.4, atualize a página e repita.
4. Confira também HP/escudo e alternância CONF 1/2 com cooldown, chat, minimapa e rotação de tela.
5. Se os FPS seguirem próximos de 12 com tempo de desenho alto, a próxima prioridade é otimização do Canvas (sprites, filtros e composição), e não mais redução de HUD.

## Instalação
Colocar o ZIP completo sem extrair na raiz do GitHub, deixando um único ZIP `stellar-legacy*.zip`, e executar o workflow `stellar-installer-main.yml`. A instalação remove arquivos legados por `rsync --delete`, mas preserva a pasta `.github`. A versão deve aparecer em `/health`. **Não foi realizado deploy remoto nesta entrega.**
