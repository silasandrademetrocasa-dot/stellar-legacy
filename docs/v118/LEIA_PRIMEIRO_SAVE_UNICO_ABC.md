# STELLAR LEGACY — V118.0 Save Único A/B/C (migração controlada)

## Objetivo e limites
- `game_saves` é a **única origem de verdade do estado persistente do piloto**.
- `profiles` é a projeção derivada, confirmada na **mesma transação SQL** nas operações do Render.
- Compras, recompensas NPC, minérios, designer, PvP, relés e eventos continuam com registros de auditoria e permissões específicas. Eles NÃO são saves substitutos. Eles NÃO são apagados.
- Saves locais permanecem apenas checkpoints de interface; nunca podem inventar créditos nem equipamento.
- A/B/C guarda **três snapshots reais confirmados**. A é última confirmação, B a anterior, C a anterior a B. Nenhum deles pode ser restaurado diretamente sem reconciliar recompensas e revisões do ledger.
- A venda de Drone agora limpa referencias de drones removidos em CONF1/CONF2; itens equipados voltam ao inventario sem apagar outras configuracoes.
- A versão antiga aparecia em descrições de ARC-1/ARC-2. O catálogo foi corrigido na conta ativa e esta versão limpa rótulos antigos ao renderizar.

## Inventário dos caminhos de persistência auditados

| Camada | Estado atual / plano |
|---|---|
| `localStorage` (`saveKey`) | checkpoint por usuário; não é fonte oficial de moedas; continua apenas como recuperação de UI. |
| Coordenador `SAVE_COORDINATOR_V106` | já impede dois PUTs simultâneos, mas múltiplos eventos ainda podem deixar pendências. Mantido. |
| Hangar `equipmentSavePendingV109` + intenção V106.2 | fila especializada para mudanças de equipamento; continua como sinal de prioridade para o MESMO coordenador. |
| Missões `missionSavePendingV105` | fila para progresso e confirmação de conclusão; mesmo save, não outra base de dados. |
| Munições `AMMO_SELECTION_V1061` | seleção pendente até ACK; mesmo save. |
| `game_saves` | estado JSON completo do jogador; permanece canônico. |
| `profiles` | espelho de créditos/STL/XP/nível; **agora transacionado junto com o save do Render**. |
| `stellar_player_save_abc_v118` | cópias A/B/C verificáveis, criadas apenas por saves confirmados. |
| NPC/minério | ledgers de emissão e revisões SQL; mantidos pois evitam duplicação e fraude. |
| Economia/leilão | recibos e histórico de transações; mantidos como comprovantes, não saves alternativos. |
| Designer | tabelas próprias de propriedade e escolha; migração para visão única exige outra homologação de permissões. |
| Posição e presença | checkpoints de deslocamento e online; continuam separados para evitar gravar todo o piloto a cada movimento. |
| Farm Offline | registro da sessão + resgate único; permanece transação específica, não snapshot cliente. |
| PvP, Arena, grupos e relés | dados e logs do mundo; não devem ser sobrescritos por localStorage. |

**Importante:** versão única aqui significa *autoridade única para o estado persistente*, não uma única tabela física. A/B/C é recuperação, não três escritores concorrentes.

## Ordem obrigatória de instalação
1. Interromper alterações de Hangar nas contas em teste; encerrar operações econômicas em andamento e aguardar conclusão de farm offline ativo.
2. Guardar backup verificado no Supabase das tabelas `game_saves` e `profiles` e seus ledgers. Não excluir dados.
3. Executar **sql/STELLAR_V118_0_SAVE_UNICO_ABC.sql** no SQL Editor, antes do deploy.
4. Conferir no SQL Editor: `select proname from pg_proc where proname='stellar_commit_player_save_v118';` e `select * from public.stellar_player_save_abc_v118 limit 1;` (após executar o SQL, cada conta com save terá pelo menos a cópia A).
5. Subir somente este ZIP na raiz do GitHub e executar Instalador Universal.
6. Verificar no Render o log de inicialização, login e um save de equipamento. Conferir que as linhas A/B/C aparecem na tabela para o usuário após pelo menos três commits confirmados com intervalo apropriado.
7. Testar 1 ARC-2 no Drone, CONF1/CONF2, reiniciar PWA, comprar e vender item, em duas contas. Se houver erro no RPC, **não repetir compras**.

## Rollback
Se for necessário voltar o código para o último deploy, a função e tabela SQL adicionais podem permanecer sem uso. Nunca restaurar um snapshot A/B/C diretamente por `UPDATE game_saves`, porque os ledgers de recompensas e compras devem ser reconciliados primeiro.

## Segurança
A função SQL tem `SECURITY INVOKER` e `GRANT EXECUTE` apenas para service_role; nunca usa chaves no navegador. As triggers de antifraude e revisões continuam em `game_saves`. Falha em qualquer escrita da transação reverte os dois estados. A/B/C armazena hashes e timestamps para auditoria.

## Pontos que permanecem para uma próxima homologação, sem promessa de que foram eliminados
- RPCs SQL de recompensas de NPC/mineração escrevem diretamente `game_saves`, e as tabelas de designer/posição possuem ciclo próprio. Não é seguro removê-los sem migração dos seus direitos/permissões e cobertura de testes em duas contas.
- `SAVE_NPC_STALE` ainda é **proteção legítima** contra sobrescrever recompensas; este pacote não remove esse erro sem reconciliação.
- A/B/C não substitui o histórico de transações nem o Farm Offline.
- Testes locais não substituem uma sessão real de 8 horas no Render.
