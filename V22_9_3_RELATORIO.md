# Stellar Legacy — V22.9.3: HUD mínimo no celular

**Base:** V22.9.2 completa. **Escopo:** somente apresentação e interação do HUD.

## O que foi corrigido
- Painéis Jogador, Nave, Missões e AUX-9 diminuem para botões quadrados de 40 px quando recolhidos, com letras J / N / M / A para identificá-los.
- Evento galáctico e Target Lock recolhidos ficam com 40 px, sem conteúdo residual nem interceptar o toque em elementos vizinhos.
- O dock superior aproveita a área liberada na direita quando os indicadores táticos ficam recolhidos ou ausentes.
- Toque no evento recolhido expande o indicador; com o indicador aberto, toque abre os detalhes.
- Ao ocultar completamente missões/eventos, o botão não aparece indevidamente.
- Estado de cada painel continua persistindo na preferência local já existente.

## Validação
- `npm run verify` (inclui release/assets/JS e testes automatizados).
- Teste de layout em Chromium headless com larguras 390, 680, 1100 px: seis cartões recolhidos com 40x40 px.
- Testes dinâmicos de alternância hidden/expanded em viewport mobile: passou.
- Nenhuma mudança de SQL, economia, renderizador de naves, imagens, valores de HP/ESC, configurações de batalha ou regras de mineração/eventos.

## Publicação
1. Enviar apenas o ZIP `stellar-legacy-V22.9.3-HUD-COMPACTO.zip` para a raiz do GitHub main.
2. Executar Actions → Instalar versão do Stellar Legacy → Run workflow.
3. Verificar Render LIVE; no celular testar recolher/expandir cards e eventos.
4. Os bugs prévios de minério e eventos requerem validação em multiplayer após o deploy da V22.9.2, que é a base incorporada a esta versão.
