# Stellar Legacy V103 • Farm Offline protegido (47.7.59)

Instalar **sobre V102 (47.7.58)** com o Instalador Universal. Arquivo ZIP cumulativo de código; **não executa SQL** e não altera saves/saldos.

## Diagnóstico real do código

O resgate no Supabase usa `stellar_offline_farm_claim_v49`. Ele verifica se o timestamp de `game_saves`, de `profiles` ou os ledgers de recompensa online mudaram depois do início do Farm Offline. Se mudar, ele converte a sessão em `conflict` e registra **zero recompensa**, mesmo se o usuário tiver esperado muitas horas. Essa restrição é necessária para não misturar ganhos online/offline, mas as rotas de mutação do jogo não estavam todas cobertas pelo middleware do Farm.

## Proteções V103

1. **Servidor Render:** middleware autenticado, antes das rotas do jogo, bloqueia mutações de economia, save, localização, progresso, Arena, Portais, Warfront, clãs etc. durante farm em andamento. GETs e operações separadas (login, ADM e telemetria) seguem funcionando. Verificação do estado do farm feita diretamente no Supabase, sem confiar em cache de falso negativo. Em falha de leitura do banco, nenhuma mutação passa.
2. **Cliente APK/Web:** bloqueia RPCs mutantes que vão **diretamente ao Supabase** enquanto a sessão está em Farm Offline. Mantém leitura de rankings/loja/hangar/arena, chat e lances registrados separadamente. Abrir o painel de Arena não sincroniza mais um perfil mutante; ataques e reivindicações de recompensas aguardam fim do Farm.
3. **Pré-checagem antes de resgatar:** consulta os mesmos sinais que a RPC SQL utiliza. Se houver conflito, a API responde `FARM_REVIEW_REQUIRED` **antes** de invocar `stellar_offline_farm_claim_v49`. A sessão continua registrada como `running`, com evidência para revisão administrativa; o jogo não apaga 8 horas automaticamente nessa etapa.
4. **Botão VERIFICAR SEGURANÇA DO RESGATE:** mostra se o save, o perfil, recompensas de NPC ou minérios apresentam conflito. O botão DIAGNOSTICAR FALHA da V91 permanece.
5. **Segurança de sessão:** a lógica de resgate continua transacional e idempotente na RPC SQL já existente. A proteção evita alterações incompatíveis; não adiciona recompensas no cliente ou saldo retroativo.

## O que NÃO é garantia

- Não é possível afirmar que 8 horas serão sempre creditadas: ainda podem ocorrer falhas externas do Supabase, sessões substituídas, inconsistências preexistentes ou gravações feitas diretamente por outro sistema que ignore o cliente e as rotas protegidas.
- A RPC `stellar_offline_farm_claim_v49` **permanece inalterada no banco**. Ela faz a verificação final dentro da transação SQL e pode retornar `conflict` em uma corrida excepcional ocorrida após a pré-checagem.
- O middleware do Render não intercepta alterações feitas diretamente por outros aplicativos/contas com privilégios de escrita no Supabase. Uma proteção 100% autoritativa de todas essas operações exige auditoria das funções SQL, políticas e triggers **no projeto Supabase correto**, que não estava acessível nesta sessão.
- O Leilão registra lances separadamente, mas uma **liquidação ou crédito feita por outro sistema durante o farm** pode alterar o perfil e causar conflito. Para teste de 8h, não participe de leilões que terminem antes do resgate, até auditarmos sua função SQL de liquidação.
- O script de compensação manual não foi criado: sessões antigas marcadas `conflict` não devem receber créditos sem confirmação no ledger.

## Matriz de atividades enquanto o farm está ativo

| Atividade | V103 | Motivo |
|---|---|---|
| Ver mapa de menus, Hangar, Loja, Arena, rankings, progresso | Consulta permitida | Não altera save |
| Chat | Permitido | Registro independente |
| Lances no Leilão | Registro separado permitido (com ressalva de liquidação externa) | Tabela independente |
| Compra, refinaria, pesquisa, habilidades, equipamento, moedas | Bloqueado | Escrita em save/perfil |
| Batalha Arena, recompensas Arena, ataques PvP | Bloqueado | Pode alterar progresso |
| Missões, recompensas competitivas, recompensas Astrais, eventos | Bloqueado | Evita concorrência de crédito |
| Movimento, seleção, combate, mineração e sincronização de mapa | Bloqueado | Mundos online/offline separados |
| Login/sessão, consulta de configurações, ADM de mundo | Permitido | Não altera save automaticamente |
| Farm status, prévia, pré-checagem, cancelamento, resgate | Permitido | Controle do próprio Farm |

## Como validar

1. Instale V103 sobre 47.7.58, aguarde o deploy e gere o APK novo.
2. Inicie uma sessão curta de **30 minutos** numa conta de testes; no meio, navegue pelos menus, consulte Hangar e Arena. Tente executar uma habilidade ou combate na Arena: deve mostrar que a alteração está bloqueada até o término.
3. Ao final, clique **VERIFICAR SEGURANÇA DO RESGATE**. O status deve estar aprovado. Clique **RESGATAR** uma vez; confira o saldo antes/depois e o histórico da sessão.
4. Confirme em um segundo teste se reiniciar o APK, deixar a tela apagada ou perder temporariamente a rede **não altera o status do Farm Offline**. O tempo é calculado no servidor (SQL), não por timer JavaScript no celular.
5. Só depois faça 8 horas. Evite simultaneamente outros dispositivos na mesma conta e operações que liquidem no perfil.

## Testes desta entrega

`npm run verify` do projeto V103: **180/180 testes**. Instalação/rollback em cópia isolada (relatório do instalador a seguir). Não houve teste de resgate de 8 horas real nem atualização SQL.
