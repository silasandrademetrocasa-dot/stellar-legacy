# Stellar Legacy V63 — 2D e 3D da mesma frota

Pacote CUMULATIVO V55–V63, compatível com Instalador Universal; instalar apenas este ZIP na raiz do GitHub.

- A vitrine deixa de mostrar recortes da prancha conceitual e passa a usar imagens renderizadas dos GLBs finais, com fundo transparente e sem sombras artificiais.
- Cada uma das 13 naves tem uma miniatura 512×512 `.webp` real em perspectiva 3/4.
- O mapa 2D agora usa sprites 16-direções 4×4 criados a partir do mesmo GLB, sem imagens antigas; as sprites ficam em `/public/assets/v63/ships/*_16.webp`.
- Os modos Auto e 3D tentam renderizar os GLBs finais V62, aumentando a nitidez de WebGL2 para 224 px no Auto e 344 px no modo 3D. Quando 3D não carregar, volta à sprites V63.
- A Loja, o Hangar e a vitrine lateral de nave ativa usam os modelos V63; os designers continuam sendo mantidos.
- Não muda os atributos, economia, mecânicas de combate, estatísticas, inventário, SQL ou progresso.

**Limitações:** o desempenho/FPS da alteração ainda precisa ser testado em Android. Modelos GLB atuais mantêm a geometria do V62; esta versão melhora enquadramento, iluminação, resolução e consistência dos sprites, não refaz a topologia.
