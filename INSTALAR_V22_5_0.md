# STELLAR LEGACY — INSTALAÇÃO V22.5.0

## Ordem obrigatória

1. **Supabase:** abra o projeto `stellar-legacy` → SQL Editor. Execute **uma única vez** o conteúdo inteiro de `sql/STELLAR_V22_5_0_CLAN_OPERATIONS_HALL.sql`, contido neste ZIP. A migração **NÃO foi executada automaticamente** durante a preparação deste pacote: a conexão de execução SQL foi bloqueada. Antes de instalar o ZIP, confirme que a execução terminou sem erro.
2. **Render:** mantenha as variáveis `SUPABASE_URL`, chave publicável e `SUPABASE_SERVICE_ROLE_KEY` configuradas. Nunca compartilhe nem coloque a chave de serviço no GitHub.
3. **GitHub:** deixe apenas o ZIP `stellar-legacy-V22.5.0-...zip` na raiz e use **Actions → Instalar versão do Stellar Legacy → Run workflow**.
4. **Render:** aguarde o deploy e confirme `22.5.0` no endpoint de versão/health. Se o serviço não carregar, consulte os logs sem expor segredos.

## Novidades

- **Universo Dinâmico real:** configure no Centro de Comando → Temporada → Administração um aviso ativo de tipo *invasão*, *chefe mundial* ou *recursos*, em um mapa comum (X-1 a X-8 ou PvP). O servidor lê o calendário e gera NPCs/minérios através do motor já existente. Eventos oficiais de maior prioridade continuam prevalecendo. Limpeza automática ao terminar. Categorias `alert` ficam apenas informativas.
- **Missões coletivas de clã:** Centro de Comando → Temporada → Missões Coletivas. Requisitos de conquistas ou defesas confirmadas; só o líder do clã resgata uma recompensa única para o cofre. O ADM pode criar/editar modelos na Administração Competitiva.
- **Arquivo de temporadas:** informações de temporadas encerradas, total de participantes, facção vencedora e prêmios resgatados.
- **Motor:** novos módulos separados para operações dinâmicas e clãs, testes ampliados e leitura de programação a cada ~20 segundos.

## Testes sugeridos

1. Confira A, B e C após atualizar a página; os donos devem permanecer.
2. Alterne CONF 1/2, nave rápida/escudos e mapas PvE/PvP.
3. Crie um **aviso inativo** de teste, depois ative com janela curta e veja NPCs/minérios surgirem e sumirem ao término. Teste em mapa PvE primeiro. NPCs de eventos oficiais continuam prioritários.
4. Crie uma missão coletiva inativa no ADM; ative somente depois de conferir os valores. Conquistas anteriores do clã já contam se foram registradas no banco com `clan_id`.
5. Valide que apenas o líder pode resgatar e que o prêmio de cofre não pode ser duplicado.
6. Confira o arquivo de temporadas com a lista existente; nenhuma temporada nova foi criada automaticamente.

## Segurança e limites

- **O SQL só adiciona estrutura de clãs e histórico**; não apaga saves, conquistas de relés, inventário, movimentos ou temporadas existentes.
- As recompensas do Universo Dinâmico são **as recompensas habituais dos NPCs/minérios**; não há multiplicadores arbitrários nem novo prêmio de participação.
- **Não incluí nesta entrega** chefes exclusivos de clã com instância própria, recompensa inédita por invasão, nova árvore de prestígio nem refatoração completa do `game.js`. Esses exigem fases adicionais e testes de carga.
- Os testes automatizados passam localmente, mas **multiplayer e desempenho real ainda precisam da validação após o deploy**.
