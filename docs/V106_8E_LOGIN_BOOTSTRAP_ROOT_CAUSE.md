STELLAR LEGACY V106.8E — HOTFIX DE BOOTSTRAP / FORMULARIO DE LOGIN

CAUSA REPRODUZIDA EM CHROMIUM (SEM ACESSO A CONTA):
Ao executar public/game.js, a inicializacao de createStellarAutopilotV48 chama getSnapshot -> rocketReady -> getRocketCooldown -> turboRocketEnabled -> hasExtra; a antiga hasExtra acessava progress.shipLoadout com progress=null ANTES do login. Isso lancava TypeError e impedia a linha ui.loginForm.onsubmit de ser executada. O formulario voltava ao GET padrao, navegando para /? e mostrando o splash novamente.

CORRECAO:
- hasExtra retorna false sem save/progress carregado, sem alterar as regras apos login.
- Nova marca de bootstrap somente quando o botao ENTRAR recebeu o handler.
- Em falha futura, o formulario impede reload por submissao padrao e exibe erro de inicializacao.
- Cache-busting de game.js para Web.

BASE: aplicar o ZIP SOBRE V106.8D (Universo e missoes em isolamento) que esta publicado. Nao aplicar V106.9.
NAO ATIVA: Universo Estelar/Expansao Unificada (ainda isolado via HTML, servidor e SQL) e conclusao automatica de missoes (V106.8D).
NAO ALTERA: saldos, SQL, inventario, hangar, missoes persistidas, NPCs, mapas, shared universe, perfis.

VALIDACAO: na WEB, primeiro observar a marca V106.8E; tentar login; confirmar que nao volta automaticamente para /?;
se entrar, verificar CONF1/2 e farm; encerrar teste apos confirmar o acesso, porque missoes estao pausadas pelo A/B.
APOS SUCESSO: restaurar as missoes e Universo de maneira controlada numa proxima versao sobre a base validada.
Reproducao local com navegador/Blobs: antes TypeError "Cannot read properties of null (reading shipLoadout)" e onsubmit ausente. Depois: 109 modulos carregados, onsubmit function.
