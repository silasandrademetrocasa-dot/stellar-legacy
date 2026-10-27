# STELLAR LEGACY V85 — Farm Offline sem bloquear os menus

Versão de origem: 47.7.40 (V84). Versão de destino: 47.7.41 (V85).

## Defeito identificado

`#app` possui `isolation:isolate`, mas a V84 criava `#v485-world-lock` em `document.body`, acima de todo o aplicativo. O `z-index` mais alto da topbar não escapava do contexto de empilhamento do `#app`, por isso menus pareciam tocáveis mas não recebiam o toque.

## Solução

- A camada visual de farm agora é filha do `#app` e se posiciona imediatamente depois do Canvas, abaixo do menu superior e dos modais. Não intercepta toques sobre a tela inteira.
- O Canvas e sprites da partida ficam ocultos por CSS (`visibility:hidden`), sem exclusão, troca de textura ou mudança de save.
- Minimapa, informações de posição, HUD de combate e controles do mundo ficam ocultos. O menu MAPA não revela a rota enquanto o farm está ativo.
- Todas as ações de navegação, combate, seleção, teleporte e atalhos continuam bloqueadas nos manipuladores existentes, independente do CSS.
- Menus PILOTO, MISSÕES, BATALHA, MAIS, Loja, Leilão, Hangar, Arena, clã, Configurações e ADM continuam disponíveis. O Leilão não tenta salvar o snapshot antigo do piloto durante farm; operações dependentes do save só voltam após reconciliação.
- Ao concluir, cancelar ou ao retomar uma sessão inativa, a classe `stellar-offline-active-v485` é removida e o mundo volta a aparecer.

## Testes

1. No Farm Offline ativo, abrir PILOTO → HANGAR; fechar e abrir MAIS → LEILÃO e BATALHA → ARENA.
2. O mapa não pode ser exibido, a nave nem os NPCs aparecem e o minimapa desaparece.
3. Tocar na região vazia não movimenta a nave, não seleciona NPC nem dispara armas.
4. Confirmar que as sessões e prêmios de farm continuam apenas no servidor e o tempo corre normalmente.
5. Resgatar ou cancelar: voltar a enxergar nave, mapa, minimapa e HUD, após sincronização.

A validação automatizada de CSS/DOM em Chromium comprova que os botões de PILOTO, MISSÕES e BATALHA ficam no topo da pilha e que seus modais abrem com o mundo bloqueado. Os testes automatizados não autenticam uma sessão com farm real no Motorola: teste final no aparelho é necessário.
