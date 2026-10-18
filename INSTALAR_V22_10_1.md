# INSTALAR — CORREÇÃO DA BARRA DE MUNIÇÕES

A correção resolve a barra ARMAS excessivamente alta no celular. O problema estava no CSS: o cabeçalho utilizava toda a largura enquanto o conteúdo de munições era colocado ao lado e ficava com largura zero. Os botões acumulavam altura e o painel ocupava boa parte da tela.

## Ajustes
- O cabeçalho ARMAS fica acima das opções de laser/míssil, nunca lado a lado com a área de seleção.
- Laser e mísseis possuem fileiras de botões com rolagem horizontal independente quando necessário.
- O botão de habilidade da nave permanece quadrado e pequeno. O Kamikaze permanece fora dessa barra, reservado ao AUX-9.
- A barra recolhida usa apenas 40 × 40 px, preservando o restante do HUD Inteligente.

## Publicação
1. Remova outros ZIPs `stellar-legacy*.zip` da raiz do GitHub.
2. Envie somente `stellar-legacy-V22.10.1-CORRECAO-MUNICOES.zip` para a raiz da branch `main`.
3. Execute **Actions → Instalar versão do Stellar Legacy → Run workflow**.
4. Aguarde o Render ficar LIVE e recarregue a página para invalidar o cache.
5. Teste seleção de laser, míssil, habilidade, recolher e restaurar a barra, além dos perfis do HUD.

**SQL: não há alterações.**
