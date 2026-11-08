# Stellar Legacy V132 — Natal Estelar cumulativa

Atualização para a base online V131 / V131.1 / V131.2 (versão técnica 47.7.63).
Contém as correções cumulativas de sincronização, venda e mensagens da V131.2.

## Instalação
1. Faça backup do repositório e mantenha o jogo sem jogadores durante a preparação do SQL e o deploy.
2. Execute sql/STELLAR_V132_NATAL.sql no SQL Editor do Supabase. O arquivo está dentro deste ZIP. O instalador GitHub NÃO executa SQL.
3. Deixe somente STELLAR_V132_NATAL_CUMULATIVA.zip na raiz do GitHub e execute o workflow Instalador Universal existente.
4. O workflow extrai, substitui, remove os arquivos listados no manifesto e apaga o ZIP instalado. Mantém os workflows existentes.
5. Após o Render publicar, entre novamente e abra o botão NATAL.

O SQL V132 foi validado em PostgreSQL local (PGlite), com estrutura compatível e funções de persistência simuladas. Não foi aplicado ao projeto Supabase de produção nesta entrega: a solicitação de execução expirou. Não foi realizado teste multiplayer conectado ao Render/Supabase de produção.

## Conteúdo
- 32 designs: 20 atributos para Lynx/Valkyrie/Leviathan/Striker, 5 países da Leviathan, 5 designs Elite da prancha corrigida, 2 exclusivos do passe de dezembro.
- Cascos de Seraph, Bulwark, Phantom, Pathfinder e Kensei atualizados. São os mesmos IDs de nave existentes; propriedade e atributos básicos mantidos.
- Designs vinculados ao casco, validação SQL e seleção lembrada por nave. Os 4 desbloqueios universais antigos de HP/dano/escudo/XP concedem equivalentes às quatro naves de loja. Os designs legados continuam possuídos e ficam vinculados à Leviathan.
- Atributos especiais reproduzem a prancha: Solstice 14% dano/12% escudo/5% HP; Arctic 10% dano/18% escudo/6% HP; Midnight 15% dano/11% escudo/5% velocidade; Orion 12% dano/10% escudo/5% HP; Crimson 16% dano/13% escudo/6% velocidade; Cristal 18% dano/16% escudo/8% HP; Vulcão 20% dano/15% escudo/8% velocidade.
- Loja de designs na Central Natal: atributos 100 mil STL, países 150 mil STL, especiais Elite 200 mil STL. Exige possuir a nave. Esses preços são parâmetros desta entrega.
- Cristal e Vulcão: tiers 15 e 30 da trilha gratuita do passe dezembro, resgatados pela Central Natal. Temporada dezembro criada copiando os prêmios regulares de novembro.
- Floco, Nevasca, Glacial e Rei do Inverno com os valores aprovados.
- Rodadas diárias 13:05–13:55 e 19:05–19:55 nos X-4; 16:05–16:55 e 22:05–22:55 em um PvP alternado. Horário de Brasília. Uma rodada é omitida integralmente se coincidir com qualquer evento principal e suas margens.
- Rei aos 20 minutos, ou antecipado após 60 abates e ao menos 5 minutos de rodada. Participantes online com ao menos 1% do dano e atividade recente recebem parcelas proporcionais ao dano; suporte sem dano ainda não qualifica. Um abate coletivo por chefe, registrado em banco.
- Dez boxes natalinas simultâneas por mapa elegível, reposição em lotes de 60 segundos. Um prêmio da tabela bônus atual com quantidade dobrada; sorteio adicional: 95% nenhum núcleo, 4% um, 1% dois. Cores e munições são salvas pelo servidor.
- Três missões pessoais, três etapas por facção e três globais. Metas congeladas na primeira aplicação do SQL, proporcionais às contas com save atualizado nos 14 dias anteriores. Participação mínima coletiva: 20 NPCs ou 10 boxes. Cada etapa exige cumprir ambos os contadores coletivos.
- Contadores permanecem entre desconexões. A temporada preparada vai de 07/11/2026 a 06/01/2027, com resgate dentro desse prazo. Configuração em stellar_natal_config_v132.
- Cupom NATALESTELAR: 10M CR, 10 mil STL, 5 núcleos, 10 fogos. Uma vez por conta; também funciona no resgate comum de cupom.
- Fogos cosméticos manuais: armam em 2s, terminam até 5s, um lançamento por jogador a cada 5s, consumo confirmado pelo banco. Até 2 efeitos desenhados no modo baixo, 4 nos demais, opção ocultar. Sem dano.
- Tema de menus e Central Natal, avisos de cinco minutos, celebração local de novas metas coletivas, título selecionável Guardião do Natal e distintivo registrado no painel.

## Validação
586 testes Node aprovados; verificação de sintaxe, assets e módulos; testes SQL de aplicação repetida, recibos, dupla coleta, cooldown, vínculo de designs, metas e negação de acesso direto; navegador Chromium em tela móvel para painel, sprites, fogos e boot do jogo.

Após publicar, validar com duas contas: coleta concorrente, chefe compartilhado, reconexão e troca de CONF/nave. Ainda não há medição de FPS em Android físico nem ensaio multiplayer em produção.
