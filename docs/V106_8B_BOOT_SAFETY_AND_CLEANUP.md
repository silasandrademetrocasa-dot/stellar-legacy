# V106.8B — Inicialização protegida e limpeza conservadora

## Sintoma
Loading desaparece antes do fim da autenticação; login permanece visível/parece não avançar.

## Causa confirmada no código
`afterAuth()` aguardava `OFFLINE_FARM_V484.enable()`, cujo `refresh()` consultava sequencialmente status, preview e opções (até 22 s por chamada), e depois `refreshAdminStatus(true)`. O splash era encerrado automaticamente após 9 s. Essa cadeia podia segurar o jogo sem apresentar erro. Não foi possível reproduzir o problema com sessão real do usuário em navegador automatizado, portanto a causa final da falha Web/APK ainda requer smoke test.

## Alterações
- Status do farm verifica rapidamente (8,5 s); opções, preview e configuração avançada são carregados apenas ao abrir o menu do farm.
- Sem confirmação do status: mundo continua bloqueado por segurança; não inicia farm, combate, economia ou autocompra silenciosamente. O jogador pode abrir FARM OFFLINE e usar ATUALIZAR.
- Painel ADM atualiza em segundo plano e não impede a entrada do jogador. Estado ADM desconhecido não é usado como autorização para corrigir mapa de facção.
- Tela de loading informa demora em vez de desaparecer silenciosamente; mostra fallback após 20 s.
- Falhas de bootstrap aparecem no login com mensagem legível, sem apagar tokens/saves.
- Manifests e instruções antigas na raiz são arquivadas em `docs/archive/legacy-release-notes-ate-v1068/` e removidas de suas posições antigas pelo instalador universal.

## Limpeza segura
A auditoria detectou assets de caminhos dinâmicos; **não eliminamos imagens/sprites nem código de jogos** por simples ausência de referência literal. Deltas evitam baixar os 74 MB de artes novamente. SQL e tabelas não modificados.

## Testar antes de evoluir
1. Abrir a versão Web com sessão válida; login e loading não devem bloquear por Farm/ADM.
2. Testar sem farm: carregamento em X-3, NPCs e 2 CONFs inalteradas.
3. Testar com farm rodando: mundo pausado e painel de resgate acessível.
4. Simular timeout na consulta inicial de status: mundo bloqueado e painel recuperável.
5. Testar APK recompilado separadamente.
