# Stellar Legacy — HUD compacto em todas as janelas

## Instalação
1. Na raiz do GitHub, deixe **apenas** `stellar-legacy-V22.9.4-HUD-TODAS-JANELAS.zip` (com `stellar-legacy` minúsculo).
2. GitHub → Actions → Instalar versão do Stellar Legacy → Run workflow.
3. Aguarde o deploy do Render e atualize a aba do jogo no celular.
4. Não executar migração SQL: esta versão altera somente interface e cache/versionamento.

## Checklist no jogo (mobile)
- CONF → Visibilidade do HUD: exibir Jogador, Nave, AUX-9, Missões, Atividade, Chat, Minimapa, Munições e Portal Astral.
- Recolher cada janela tocando em sua seta. Verificar botão de 40×40 px e reabertura ao tocar.
- Em Atividade, botão recolher fica ao lado de Limpar histórico; Limpar não aparece recolhido.
- Portal Astral só aparece durante portal ativo; recolher e expandir dentro de uma partida.
- Munições recolhidas deixam o combate da barra escondido; para atacar por toque, reabrir a barra.
- CONF desabilitado: janela desaparece totalmente, não fica um botão vazio.
- Missões e eventos ausentes: não devem aparecer botões fantasmas.
- Testar com Evento e Alvo na lateral direita; cinco botões compactos da esquerda devem continuar acessíveis (podem quebrar linha).
- Confirme que o estado de Atividade/Portal Astral persiste após F5.

## Validação concluída antes de publicação
324 testes automatizados aprovados; medição visual de 40×40 px em 390, 680 e 1100 px; testes de prioridade de visibilidade.
A validação em multiplayer publicado ainda é necessária.
