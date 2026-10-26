# Stellar Legacy V75 — Diagnóstico de isolamento visual (WEB)

**Base exigida:** 47.7.30 (V74). **Nova versão:** 47.7.31.

Esta atualização não altera regras de jogo nem banco de dados. Ela adiciona testes A/B manuais de desenho por 35 segundos, no painel Configurações > Jogo, abaixo do diagnóstico de desempenho.

1. Selecione qualidade **Média**. Ative diagnósticos.
2. No teste A/B selecione **Padrão (controle)**, inicie, feche Configurações, mantenha o mapa e a orientação por 35 segundos.
3. Repita no mesmo lugar, preferencialmente parado e fora do combate: **Sem fundo**, **Sem desenho de bases/portais**, **Sem desenho dos relés**, **Sem FX opcionais**, **Sem minimapa**, **Sem painéis secundários do HUD**.
4. Use **Copiar relatório técnico** (inclui os resultados dos testes concluídos). Envie o texto aqui.
5. Cada teste restaura o visual normal automaticamente. Use também o botão flutuante **RESTAURAR**.

**Segurança:** As opções escondem apenas desenhos (temporariamente), e por isso os testes devem ser feitos fora de combate. NPCs e jogadores continuam desenhados, servidor, hitboxes, colisões, economia e ataques NÃO são desligados. Os testes são cancelados ao alterar mapa, qualidade, resolução ou ocultar a aba. Dados ficam somente na memória do navegador.

**Limitações:** A/B sem equivalência de cena ou carga de trabalho não comprova causalidade. FPS não inclui custo da GPU. As medições permitem direcionar a próxima correção, não prometem 30 FPS.
