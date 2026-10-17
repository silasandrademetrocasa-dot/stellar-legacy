# STELLAR LEGACY V20.2.3 — OTIMIZAÇÃO GRÁFICA SEGURA

Base: V20.2.2 (ZIP completo). **Sem SQL e sem atualização do Supabase.**

## Mudanças

- `public/modules/scene-gradient-cache.js`: cache máximo de 3 conjuntos de gradientes estáticos, reutilizados a cada quadro. Quando o tamanho da tela, o mapa, a paleta ou o perfil gráfico mudam, o conjunto correspondente é refeito. A iluminação que pulsa continuamente continua dinâmica.
- `public/game.js`: drawNebula, overlay do fundo e luz secundária usam os gradientes reaproveitados, com exatamente os mesmos parâmetros e cores de antes. `onScreenWorld` passa a testar limites diretamente, sem criar um novo objeto para cada teste de visibilidade.
- `tests/scene-gradient-cache-v2023.test.mjs`: regressões de reaproveitamento, invalidação por mapa/resize e equivalência de limites de visibilidade.
- Versão, cache-busting de JS/CSS e health check atualizados para 20.2.3.

## Preservado

Combate, posições, configurações CONF 1/2 e cooldown de 5 segundos, HP/escudo, reparação, inventário, NPCs, clãs, missões, persistência, login, login Google, Supabase, SQL e assets. Não há telemetria remota nova nem alteração nos limites de FPS existentes.

## Instalação e validação

1. Aguarde confirmação de estabilidade da V20.2.2. Envie o ZIP completo da V20.2.3 para a raiz do GitHub (somente um ZIP de instalação).
2. GitHub Actions → Instalar versão do Stellar Legacy → Run workflow.
3. Confirme `/health` mostrando V20.2.3 e que o Render completou `npm run verify`.
4. No Android teste troca de mapa, mudanças de qualidade ALTA/MÉDIA/BAIXA/AUTO, orientação da tela, naves/NPCs e CONF 1/2 durante batalha.
5. CONF → JOGO → ative Diagnóstico e compare FPS, P95 e trabalho do desenho na V20.2.2 e na V20.2.3 em mapas/qualidade equivalentes. Sem medições reais ainda, o ganho de FPS não é garantido.

## Limite

O teste de sintaxe e regressões locais não substitui teste real no Render/Android. Não houve alterações no GitHub remoto ou nos dados dos jogadores.
