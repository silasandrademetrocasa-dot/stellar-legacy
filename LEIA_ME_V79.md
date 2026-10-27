# Stellar Legacy V79 — motor compacto e artes preservadas

Base obrigatória: **V78 / 47.7.34**. Destino: **V79 / 47.7.35**.

- Motor de player, pilotos remotos e NPCs usa o desenho compacto **idêntico ao Baixo**, inclusive no Alto. Não há mais gradientes radiais nem blend `lighter` nesses motores.
- As texturas originais TOP de naves, drones e AUX são mantidas em todos os modos. A interpolação do sprite agora é consistente entre qualidades (`medium` no celular, `high` no desktop), sem diminuir ou substituir os arquivos de arte.
- Sombras e filtros de Canvas sobre sprites foram eliminados no mapa (a arte mantém cores e detalhes originais). Auras decorativas de designer e NPC não são desenhadas no celular; os marcadores de alvo, vida e escudo permanecem.
- Menos efeitos visuais acumulados no celular (FX cosméticos comuns: Baixo até 12, Médio 24, Alto 32; Combat Reborn Médio 5, Alto 7). Dano, recuperação, tiros, ataque NPC, eventos e networking **não mudam**.
- Números de dano continuam legíveis, sem `shadowBlur` no celular. Todos os modos mantêm os relés protegidos, seleção circular e efeitos leves de laser/escudo introduzidos na V78.

**Validação:** executar `npm run verify` e instalar este ZIP somente na base V78. FPS depende de teste no aparelho; o vídeo recebido ainda mostrou ~9–10 FPS em momentos de combate intenso, portanto não há promessa de 30 FPS.
