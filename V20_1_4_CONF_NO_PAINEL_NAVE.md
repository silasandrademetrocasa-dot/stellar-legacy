# Stellar Legacy V20.1.4 — CONF 1 / CONF 2 dentro do HUD NAVE

- Controle de troca movido do HUD **MUNIÇÕES** para o painel flutuante **NAVE** (HP / ESC / VEL / PORÃO).
- Ambos os botões ficam visíveis na área da nave aberta, incluindo celular de tela estreita.
- O painel NAVE agora dispõe de altura adequada para os controles (172 px em celular); outros painéis não mudam.
- Ao recolher NAVE, os botões ficam ocultos; o cabeçalho mostra C1 / C2 para a configuração ativa.
- O contador de 5 segundos e o bloqueio de troca seguem a implementação já testada em V20.1.3.
- Sem mudanças nas fórmulas de HP, nos escudos guardados por configuração, em inventário, PvP ou servidor de economia.
- Sem SQL novo.

## Instalação

Colocar o ZIP completo na raiz do GitHub e executar `.github/workflows/stellar-installer-main.yml`. Não extrair manualmente nem alterar o instalador. Após o deploy Render, atualizar a página e expandir o painel NAVE. Confira que CONF 1, CONF 2 e tempo de troca aparecem abaixo do porão. O HUD de munições não mostra mais a troca.
