# Stellar Legacy — V76 | Relés protegidos em TODOS os modos

Base obrigatória: **V75 47.7.31**. Destino: **V76 47.7.32**.

## Correções

- A renderização dos relés foi isolada em módulo próprio para qualidade **Baixa, Média, Alta e Automática**, no celular e no desktop.
- O modelo V71 do relé continua visível, centralizado pelo recorte V74, mas sem composições animadas sobrepostas, discos translúcidos ou anéis pesados por quadro.
- Mostra quatro marcadores visuais da área de captura, barras de escudo/HP, dono, contestação e alvo. O raio de captura *lógico* do servidor **não muda**.
- Todos os desenhos do relé passam por `ctx.save()`/`ctx.restore()` garantidos; falha no sprite aciona fallback leve e não deve abortar a renderização da nave.
- Dados inválidos recebidos para coordenadas são ignorados no desenho. O relatório de diagnóstico informa a contagem local de erros.
- A renderização dos relés usa o caminho protegido em todos os modos; lógica de combate, dano, alvo, NPCs, posição, multiplayer, economia e Supabase não foram alterados.

## Teste no celular

1. Após a publicação, confirme 47.7.32. Reinicie a aba do jogo para evitar assets antigos no navegador.
2. Teste BAIXA e MÉDIA, mantendo a mesma orientação e mapa. Faça 60 s longe do relé, depois 60 s perto do relé em cada modo.
3. Confira se a nave e HUD permanecem visíveis e se não aparecem mais piscadas.
4. Em Configurações → Diagnóstico de desempenho, copie o relatório, especialmente a linha `V76 • relés renderizados … erros isolados …`.
5. Repita o A/B normal e sem desenho dos relés na mesma cena. Uma diferença residual de FPS indica gargalo adicional.

**Limitações:** verificações automatizadas não atestam FPS real do Motorola. A V75 sem desenhar relés já mediu 14–17 FPS; portanto, a V76 não pode prometer 30 FPS apenas corrigindo os relés.

## Rollback

Se persistirem falhas, aplique o ZIP V76 → V75 pelo Instalador Universal. Não executar SQL ou mudar o Render.
