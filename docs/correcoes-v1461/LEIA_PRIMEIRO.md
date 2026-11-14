# Stellar Legacy Mobile — V146.1 / 47.8.1

Cumulativa sobre a versão V146 em teste. O pacote também inclui as alterações anteriores desde a base V144.1 (47.7.80), sem substituir artes. **Nenhum deploy nem alteração do banco de produção foi executado nesta correção. Não há SQL novo: mantém o SQL V146 já aplicado no Supabase.**

## BOX/AUX sem permanecer parado esperando confirmação

Na V146, a solicitação da prova de posição ocorria depois do append em IndexedDB. No Android mais lento, o AUX podia ter avançado para outro alvo antes dessa solicitação. Outra janela aparecia quando o update normal de jogador era descartado pelo limite de 80 ms: a prova podia conter a posição anterior do AUX. A validação econômica permanecia correta, mas recusava uma chegada legítima ou demorava a processá-la.

Agora a observação é enviada no contato, antes da espera do disco. O contato transporta o AUX no mesmo instante; a nave continua com a posição conhecida pelo servidor e suas restrições de movimento. Posse do AUX, gear BOX, mapa, radar, tether, alcance, capacidade e recibos continuam validados no servidor. Não se aumentou o raio de coleta nem se aceitou recompensa enviada pelo cliente.

A prova assinada recebida continua gravada na fila persistente. Se sua resposta se perde, o servidor pode recuperar a primeira observação do mesmo ID por dois minutos, num cache limitado a 2.048 entradas, sem SQL. Esse cache guarda provas, não saldos ou recompensas. Pendências antigas da V146 sem prova válida podem ser recusadas e exigir nova coleta: não se inventa retroativamente uma chegada que o servidor nunca observou. Os eventos e recibos são reconciliados sem conceder prêmio duplicado. Uma vez persistida no aparelho, a prova conserva a validade anterior do protocolo. O cache não sobrevive ao reinício do Render; não é uma nova garantia de resgatar loot vencido.

Uma prova pronta antecipa a sincronização para uma janela de aproximadamente 500 ms. Um prefixo de eventos pronto pode ser enviado sem aguardar a prova de uma BOX posterior. A recuperação prepara no máximo quatro provas simultâneas, sem disparar uma solicitação para toda a fila de uma vez. A prova efetivamente persistida é a usada no envio, mesmo se duas respostas disputarem o mesmo evento, para manter o hash idempotente nos reenvios. Continuam existindo batching, sequência, backoff e idempotência. A confirmação econômica depende da rede e do servidor; a diferença é não precisar permanecer ao lado da caixa enquanto ela chega.

Também foi removida a reaplicação de estado, cálculo de atributos e reconstrução da loja em cada append de coleta. A remoção visual é imediata e o crédito aleatório continua sendo mostrado após o recibo legítimo. Compras e vendas mantêm o caminho da V146.

## Posição e HP ao relogar

Na V146, o início do gerenciador econômico chamava o instalador de estado antes da restauração do mundo. Esse instalador preserva os vitais e a posição do runtime durante o combate; na inicialização, porém, podia preservar o HP mínimo e a posição antiga/padrão do objeto player. O save também podia promover esse runtime ainda não carregado para um checkpoint mais recente.

A V146.1 inicializa a fila sem reinstalar o runtime e sem iniciar envios durante o bootstrap. A sincronização começa depois de restaurar o mundo. Saves nessa fase não capturam escudo/configuração/posição do player ainda não inicializado. O timestamp econômico `clientSavedAt` deixa de se passar por timestamp de movimento na seleção de checkpoint.

O carregamento conserva o HP/escudo absolutos salvos e a última localização válida. Compras locais também deixam de recalcular atributos curando a nave: preservam os valores absolutos dentro da capacidade atual. Não foi acrescentada cura gratuita, escudo de outra CONF ou restauração arbitrária de um estado antigo.

**Limite:** uma posição histórica já sobrescrita por uma versão anterior pode não ser recuperável. Se o save oficial já contém HP baixo legítimo, ele continua baixo. Para validar o novo comportamento, após instalar, mova-se até uma posição identificável, deixe o checkpoint salvar e teste relogar; confira também o casco depois de reparar e salvar. Morte, reparo obrigatório e regras de farm continuam com seus fluxos existentes.

## Módulos da base acima da nave

Os quatro atalhos — MISSÕES, COMÉRCIO, HANGAR e PORTAIS ASTRAIS — aparecem acima da nave quando ela está na própria base. Em retrato são duas linhas; em paisagem larga, uma linha. O painel fica acima da camada do HUD de munições e sua posição considera o espaço da tela.

Os atalhos usam a navegação existente até o módulo físico e os mesmos menus/validações. Estar fora da base, numa base inimiga ou com um modal aberto continua impedindo a ação. A arte da base, os pontos dos módulos e o HUD de munições foram preservados.

## Instalação

1. Use `Stellar_Legacy_V146_1_CUMULATIVA.zip` no Instalador Universal existente sobre a V146 (47.8.0). O pacote inclui os fontes alterados e as atualizações anteriores; não é necessário reenviar as partes de artes da V146.
2. Faça o deploy de cliente e servidor juntos. A mudança no servidor registra o contato e recupera provas perdidas; só atualizar o APK não aplica essa parte.
3. Gere o novo APK com o workflow e assinatura existentes. Instale como atualização, sem desinstalar/limpar os dados. Isso preserva os saves e as filas pendentes.
4. **Não precisa reaplicar SQL.** O schema V146 que foi aplicado anteriormente continua necessário e não mudou.
5. Valide BOX com nave/AUX em movimento, Autopilot, relog em duas posições distintas, HP/CONF1/CONF2 e os quatro atalhos da base.

Para reverter código, use o backup do repositório anterior, preservando dados e filas; prefira corrigir adiante se houver eventos pendentes. Não remova tabelas ou apague IndexedDB. Não foi executada a reversão SQL da V146.

## Verificação

- `npm run verify`: **294 testes, 293 aprovados, zero falhas, um ignorado por falta de JDK**.
- Sintaxe de 333 arquivos JavaScript, imports e referências de assets verificados; nenhum caminho de módulo ausente.
- Onze testes novos incluem: contato antes de disco lento; snapshot de AUX sem ampliar alcance; resposta de prova perdida; bootstrap sem sobrescrever vitais/posição; funções reais de save/restauração; compra sem cura; envio de prefixo pronto; 100 coletas AUX em PostgreSQL com contexto de sessão e replay; geometria e cliques dos quatro botões.
- Os testes antigos de 100 compras, 500 coletas e 1.000 NPCs, entre outros, continuam na suíte. O teste novo de coleta usa os handlers de recompensa e as funções SQL reais do fixture, incluindo `stellar_collection_context_v138` e a guarda de sessão.
- `npm run apk:check`: passou com 1.361 arquivos locais, 1.103 imagens, 43 naves e 40 NPCs auditados. É verificação de empacotamento; não é compilação ou teste do APK instalado.
- Nenhuma arte, preço, raio de coleta ou regra de recompensa foi alterada.

Não houve homologação desta V146.1 no Android real, medição de FPS/bateria nem comparação de carga em produção. A posição do painel foi testada por geometria e DOM em retrato/paisagem; a aparência final e o toque no aparelho permanecem para validação. O vídeo do usuário foi inspecionado para reproduzir os sintomas, não apresentado como teste da nova versão.

Esta correção não encerra a migração integral de missões, craft, farm offline e demais pendências já registradas na V146. Consulte o relatório daquela versão para o escopo que ainda não foi migrado.
