# Stellar Legacy V22.9.3 — HUD Compacto

Este ZIP contém o jogo completo. Para publicar: suba **apenas** `stellar-legacy-V22.9.3-HUD-COMPACTO.zip` na raiz da branch `main` e execute **Actions → Instalar versão do Stellar Legacy → Run workflow**. O arquivo precisa permanecer um ZIP válido e iniciar com `stellar-legacy` em minúsculas.

## Correção
- JOGADOR, NAVE, MISSÕES e AUX-9, quando recolhidos, viram botões de 40 × 40 px (J/N/M/A), sem ocupar a largura do cartão aberto.
- Eventos galácticos e Target Lock recolhidos também usam área de 40 × 40 px.
- Quando a direita fica recolhida ou vazia, o dock superior volta a aproveitar o espaço e mostra mais Missões/AUX.
- Um toque no evento recolhido o expande; outro toque no card aberto apresenta o evento normalmente.
- Estados de abertura existentes no localStorage foram preservados; ações do jogo, combate, recompensas e saves não foram alterados.

## Testar
1. Celular em retrato: recolha NAVE, AUX-9 e MISSÕES; confira se restam apenas as letras N/A/M em botões pequenos.
2. Reabra os três; verifique layout normal, seleção de configuração, modo do AUX e progresso.
3. Com evento ativo, recolha-o e observe o espaço liberado para as missões; toque no ícone para reabrir.
4. Com alvo em Target Lock, recolha e restaure, verificando as informações de HP/ESC e a área dos outros painéis.
5. Faça F5 para conferir que os estados recolhidos são lembrados.

**SQL:** não há migração. **Render:** requer novo deploy pelo instalador do GitHub. Os bugs de mineração e eventos da V22.9.2 continuam aguardando validação em produção.
