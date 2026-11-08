# V134.2 — Correção do hangar

Versão técnica: 47.7.66. Base obrigatória: V134.1 / 47.7.65.

## Instalação

Suba este ZIP na raiz do repositório e execute o mesmo workflow universal de extração e substituição. É uma atualização cumulativa em relação à V134.1 instalada: preserva as correções de AUX, coleta, leilão e SQL anteriores. Não é o jogo completo para instalar em repositório vazio.

Não há SQL novo para executar nesta versão. Mantenha as migrações V134 e V134.1 já aplicadas. Não reaplique scripts históricos nem arquivos de testes.

Após o deploy, feche e reabra o jogo para carregar 47.7.66. O pacote não altera artes, balanceamento, regras de base ou tempo de troca de CONF.

## Causa identificada e correção

Uma confirmação do checkpoint podia chegar quando o jogador já havia feito a próxima troca de equipamentos. A comparação usava a montagem anterior à primeira troca; por isso, a primeira montagem já salva podia ser interpretada como edição de outro dispositivo. O tratamento substituía o estado local e descartava a segunda troca. O merge genérico de arrays de equipamentos também podia falhar nesse intervalo.

Agora a recuperação reconhece a tentativa enviada somente quando o estado remoto contém o recibo daquela tentativa e a mesma montagem. A confirmação serve de base para preservar a próxima mudança, que continua pendente para o próximo save. O merge de combate não tenta combinar arrays de equipamentos parcialmente: o hangar é reconciliado como uma montagem completa, com conservação dos itens.

As comparações desconsideram preenchimento de slots vazios, entradas zeradas do inventário e ordem de chaves. Itens entregues pelo servidor enquanto o jogador monta a nave permanecem no inventário livre; remoções incompatíveis, mudanças efetivas de outro dispositivo e quantidade de itens inventada são recusadas. O saldo sempre vem do servidor.

A recuperação inclui nave, CONF 1/2, slots de drones, equipamentos do AUX e seus protocolos. A tentativa enviada fica registrada localmente para reconhecer uma gravação confirmada mesmo depois de fechar/reabrir antes da resposta. Essa recuperação usa recibo e conservação dos itens; um horário local mais novo não autoriza restaurar moedas.

## Verificação

634 testes passaram, incluindo os novos cenários de duas trocas antes do primeiro ACK, confirmação perdida, CONF/drones/AUX, normalização, ganho de item no servidor, estoque insuficiente e reabertura com tentativa pendente. A suíte também verifica SQL existente em PGlite, assets e imports.

Abertura em navegador móvel simulado: login e canvas presentes, sem exceção JavaScript e health HTTP 200. Isso verifica inicialização; não substitui validação de uma sessão real no celular.

## Teste no jogo depois de publicar

1. Na base, equipe/remova vários itens seguidos e aguarde o hangar confirmar. Confira nave, drones e AUX.
2. Alterne CONF 1/2 respeitando o cooldown existente e confirme que os dois conjuntos ficam corretos.
3. Aplique um preset, faça outra mudança antes de terminar o save e confira que a última montagem permanece.
4. Reabra o jogo e confira os slots. Teste também com coleta/recompensa ocorrendo durante a edição.

Se houver conflito real de outra sessão ou indisponibilidade de rede, o cliente ainda precisa reconciliar o estado oficial. A versão não promete ausência de falhas nem muda as validações do servidor.
