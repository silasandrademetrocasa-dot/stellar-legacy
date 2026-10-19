# STELLAR LEGACY V34.4.2 — GALACTIC COMBAT 2.0

Construída integralmente a partir do pacote V34.3.0 (NPC & Performance).

## Implementações
- Alcance padrão da percepção dos NPCs comuns aumentado de 800 para 1000 unidades (+25%), sem mudar alcance de tiros, velocidade, HP, drops ou dano. Boss/gate mantém personalização própria. IA respeita zonas neutras e perseguição pós-agressão anterior.
- Interpolação temporal dos NPCs no cliente: movimento exponencial com previsão limitada a 110ms, atualização de heading desacoplada e correção de teleporte >520 unidades. Ao perder pacotes, a nave inimiga converge para a última posição autorizada, evitando "ghost drift".
- Interface do lock tático: mensagem de ameaça, alcance do laser e de míssil diferenciados, preservando contadores e dados de HP/escudo.
- Efeitos de mísseis visuais acompanham a posição recente do alvo somente se não houver teleporte grande (280 unidades). Acerto/dano/cooldowns continuam definidos por funções antigas e controles autoritativos.
- Sem alterações nas migrações do Supabase; Event Control Center, calendário, 2 builds, saldo, salva-vidas/escudos e o instalador universal permanecem inalterados.

## Instalação
1. Enviar somente este ZIP à raiz do GitHub; instalador universal preservado (`.github` excluída).
2. Acionar GitHub Actions e aguardar auto deploy Render. NÃO executar SQL.
3. Comparar FPS início/estável e observar perseguição, trajetórias de NPCs, lasers, mísseis e troca CONF 1/2; validar zonas neutras e batalhas PvP.

## Limites da validação
- `npm run verify` (Node + checagem de release) não substitui testes mobile reais, testes multiplayer de produção e monitoramento do Render.
- Melhoria de FPS é objetivo de preservação, não ganho garantido.
