# STELLAR LEGACY V70 — Relatório técnico V3 (auditoria estática local)

## Evidência e contexto
- Base analisada: Stellar Legacy V69 `47.7.25`, reconstruída a partir dos ZIPs do projeto; **51/51 testes anteriores aprovados**.
- Código: Canvas 2D (`public/game.js`), um `requestAnimationFrame` principal e loops rAF independentes nas prévias de cards.
- Qualidade Alta usava DPR até 2 (potencial de 4x os pixels do DPR 1); Média, até 1,30.
- Compositor modular usa layouts carregados por mapa e renderiza decorações visíveis. O início do carregamento das texturas é agora limitado por frame.
- Existem páginas de administração, eventos e strings de assets construídas dinamicamente. Ausência de um nome em `import` **não prova** obsolescência.

## Medições objetivas de tamanho (bytes não comprimidos em disco)
| Indicador | Antes V69 | Após V70 | Diferença |
|---|---:|---:|---:|
| Total de `public/assets/` | 82,675,634 B | 68,502,775 B | 14,172,859 B |
| Total de arquivos do projeto auditado | 86,512,192 B | 72,350,476 B | 14,161,716 B |
| Cópias locais do fundo Baixo | 30 PNG (14,687,592 B) | 8 WebP compartilhados (513,942 B) | 14,173,650 B (96.5%) |
| Duplicações byte-a-byte restantes nos assets | — | 31 grupos / 2,030,524 B potencial | **não removidas sem validação dinâmica** |

A redução dos fundos corresponde a **13.52 MiB** de arquivos. Isso reduz o tamanho estático distribuído e o custo potencial de baixar o fundo de um novo mapa Baixo; não representa FPS ou tráfego medidos em aparelho.

## Gargalos identificados e alterações
1. **DPR fixo elevado no Alto.** Agora escala interna adaptativa no celular, com histerese, sem alterar lógica nem qualidade selecionada. O tamanho CSS, coordenadas e interações permanecem inalterados.
2. **Pré-visualizações com rAF independente por card.** Agora usam um agendador visual único que desenha apenas cards visíveis em até 10 FPS e remove canvases desconectados.
3. **Burst de carregamento modular.** Limita a 2 novas texturas/frame em celular e 4 em desktop. Cada posição permanece fixa entre níveis.
4. **Mapas Baixo com PNG duplicados.** 30 referências por mapa atualizadas para 8 WebP compartilhados em 768x768, preservando proporção e os 30 layouts.
5. **URLs de cache para animações versionadas.** Os recursos V69 em `/assets/animations/v69/` usam caminhos estáveis; recursos V17-V67 mantêm política de revisão por terem sido atualizados no mesmo caminho no passado.
6. **Diagnóstico insuficiente para piores quadros.** Acrescentados P99, FPS mínimo por frame aceito, DPR/escala e estimativa de bytes RGBA decodificados; o overlay antigo continua funcional.

## Classificação e limpeza controlada
- **ATIVO:** recursos com referências diretas em manifestos e módulos; manter.
- **CONDICIONAL:** animações, mapas especiais, UI e eventos carregados dinamicamente; manter.
- **OBSOLETO com prova de equivalência:** 30 cópias de fundo Baixo previamente duplicadas entre mapas. Referências atualizadas; exclusões explícitas no manifesto de instalação.
- **EM ANÁLISE:** arquivos legados, modelos e outras duplicações não usados explicitamente no código: **não removidos**, porque podem ser acessados por configuração, admin, saves ou eventos.

O inventário individual está em `STELLAR_V70_INVENTARIO_ASSETS.csv`. A economia de armazenamento/CDN pode diferir por compressão e cache HTTP. Não houve limpeza de Supabase, storage ou histórico do banco.

## Critérios ainda NÃO verificados
| Métrica | Antes | Depois |
|---|---|---|
| FPS Baixo / Médio / Alto em celular | Não medido | Não medido |
| Frames P95/P99 em 60 segundos no dispositivo | Não medido | Não medido |
| Draw calls / GPU | Canvas 2D, não disponível neste teste | Não medido |
| Heap real, textura GPU, aquecimento | Não medido | Não medido |
| Download inicial e por mapa (DevTools rede) | Não medido | Não medido |
| Multiplayer, login, combate no navegador real | Não medido | Não medido |

## Testes automatizados
- V69 inicial: 51/51.
- V70 após ajustes: 56/56 (as cinco novas verificações são regressões de scheduler, DPR, cache, compartilhamento de fundos e P99).
- `npm run check` valida imports, cache busting e assets referenciados.
- Mudanças de combate, economia, saves, banco, física, spawn, portais e hitboxes: **nenhuma alteração intencional**.

## Validação real recomendada
1. Fazer backup do commit V69 antes de instalar; instalar a V70 somente após confirmar que o GitHub está na versão `47.7.25`.
2. No menu de desempenho, habilitar diagnóstico; copiar relatório **em Baixo, Médio e Alto** em cenários equivalentes por pelo menos 60 segundos cada.
3. Testar movimento, 10+ NPCs, lasers, escudo, base, relés, portais e troca de mapa; registrar memória disponível e travamentos.
4. Confirmar o tamanho dos downloads no DevTools/Network, com cache frio/quente, e não apenas tamanho em disco.
5. Se houver regressão, aplicar o ZIP de rollback V69 (ou reverter o commit do Instalador Universal); não limpar saves/banco.

**Estado da entrega:** atualização técnica apta para teste no navegador. O alvo de 30 FPS no Alto permanece **pendente de benchmark real em hardware** e não é declarado como atingido.
