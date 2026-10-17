# Stellar Legacy — Operações de Elite + Domínio Persistente

**LEIA ANTES DE ENVIAR O ZIP PARA O GITHUB.** Esta é uma atualização com banco de dados. A instalação não termina só com o upload do ZIP.

## Ordem obrigatória

1. Faça um backup do projeto Supabase (especialmente `game_saves`) e mantenha um backup da versão anterior do jogo.
2. No **projeto Supabase correto**, abra **SQL Editor**, cole e execute integralmente `sql/V21_4_0_WARFRONT_ELITE_PERSISTENCIA.sql` (incluído neste ZIP). Esse SQL cria as tabelas de relés, métricas, objetivos e resgates, além de políticas de segurança e funções RPC.
3. No **Render → serviço Stellar Legacy → Environment**, configure `SUPABASE_SERVICE_ROLE_KEY` com a **service_role key** do mesmo projeto Supabase. Marque como segredo. **Não cole essa chave no GitHub, código cliente, arquivos públicos ou no chat.** A Publishable/Anon Key existente continua necessária. Não troque uma pela outra.
4. Faça o upload deste ZIP completo na raiz do GitHub, sem extrair, mantendo só **um ZIP do instalador**. Execute **Actions → Instalar versão do Stellar Legacy → Run workflow**.
5. Confira o deploy e os logs no Render antes de tentar capturar relés.

**Se pular o SQL ou a chave de servidor, os mapas de conquista 4-1/4-2/4-3 irão recusar o acesso em vez de permitir capturas que desapareceriam no próximo F5.** Outros mapas continuam disponíveis.

## Regras do domínio A/B/C

- Cada um dos três mapas de batalha (`4-1`, `4-2`, `4-3`) tem relés `A`, `B` e `C`, independentes entre si: **9 registros permanentes**.
- Captura finalizada só é confirmada depois de gravada no Supabase.
- Se a Terra tem o ponto A, a Terra **continua dona** após desconexão, F5, mapa vazio e reinício do Render.
- Presença de inimigos contesta a área, mas **não remove o dono**; quando outra facção conclui 100% da captura, o dono troca diretamente para ela.
- O banco controla revisões para impedir sobrescrita silenciosa por servidores concorrentes. Salas ativas verificam mudanças de outra instância periodicamente.
- **Primeira instalação:** como o servidor antigo não armazenava os donos em banco, os 9 registros começam neutros. Conquistas ANTERIORES ao SQL não podem ser reconstruídas automaticamente.

## Operações de Elite

- Em **MISSÕES → Centro de Comando → Elite**, aparecem os 13 marcos históricos do piloto (consultivos) e as operações com progresso **confirmado pelo servidor**.
- São 6 modelos ativos iniciais, com abates de NPCs e capturas de relés confirmados pelo servidor. O ADM pode criar e editar outros modelos dessas duas métricas, sem JSON.
- Os novos contadores começam na ativação; não há retroatividade para abates/relés sem trilha confiável de eventos já persistida.
- Recompensas são CR, STL e títulos cosméticos listados no Centro de Comando. **Títulos ficam registrados no histórico de Elite; equipá-los no perfil exige integração posterior com o seletor de títulos atual.**
- O resgate usa RPC do servidor de banco: bloqueia repetição por conta/objetivo, incrementa saldo no `game_saves` em uma transação e registra revisão contra saves antigos.
- ADM: **ADM → SISTEMAS → ELITE** abre o editor visual dentro do Centro de Comando. Os objetivos novos começam INATIVOS. Somente o ADM autenticado pode salvar edições.

## Teste pós-instalação (duas contas, se possível)

1. Entre em 4-1 com uma conta da Terra e capture o relé A. Confirme o dono no WARFRONT.
2. Atualize a página, feche a aba ou fique offline e volte: A deve continuar com a Terra.
3. Saia do mapa, espere a sala esvaziar; volte: A continua Terra. Reinicie o serviço no Render somente quando for seguro: o dono deve continuar Terra.
4. Entre com outra facção e conclua a captura de A: o dono vira a nova facção **sem passar por neutro definitivo**.
5. No Centro de Comando veja o contador de capturas do jogador e resgate um prêmio alcançado. Tente novamente: deve aparecer **RESGATADO**, sem duplicar moedas.
6. Atualize o jogo e confira saldo, títulos e progresso. No ADM, crie um objetivo INATIVO de teste (ex.: 5 NPCs), salve e depois ative-o.

## Limites e segurança

- Esta versão foi submetida a testes locais de código e lógica, **mas NÃO foi executada em seu banco real** nem passou por teste de gameplay no Render. Só marque como validada após instalar SQL e testar duas contas.
- O domínio não depende de presença online. Não depende de localStorage.
- Em falha do banco, o servidor não anuncia uma captura como confirmada. O novo modo de segurança pode bloquear acesso aos mapas de relés temporariamente até restabelecer a conexão.
- Não altera inventário, mecânicas de dano/escudo, tempo de troca CONF 1/2 ou regras PvP existentes.
- A atribuição de moedas nos outros sistemas existentes ainda tem rotas legadas com economia parcialmente dependente do save. Esta atualização protege especificamente os resgates de Elite, não redesenha toda a economia do jogo.
