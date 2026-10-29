# STELLAR LEGACY — V105.1 • Observabilidade de rede + leitura de grupo

## Base e implantação

Pacote **incremental cumulativo em relação ao HOTFIX 3** (47.7.60). A árvore do ZIP deve ser copiada sobre a raiz do repositório GitHub `stellar-legacy` preservando os caminhos. Não é uma versão completa do jogo. Para APK com HTML/JS embarcados, **recompilar o APK e instalar**; atualizar só o Render não altera o conteúdo do APK antigo.

A V105.1 não modifica SQL nem schema, não mexe no `package.json`, não altera regras de combate nem economia, nem muda a frequência, validação ou formato dos salvamentos.

## 1. Medição passiva do WebSocket (Render)

- Novo módulo `server/network-telemetry-v1051.js`, instrumentado em `server/world.js`.
- Conta mensagens e **bytes JSON ANTES de compressão** de entrada e saída, por tipo (até 40 categorias + `other`), sem armazenar identificadores, tokens, conteúdo ou dados individuais.
- Abrange `npc_batch`, broadcasts e respostas de evento/combate via `safeJsonSend`. Não cria nenhum pacote para os clientes.
- Log agregado no Render a cada 5 minutos, se houver atividade: procurar por `STELLAR_NETWORK_V1051`.
- O endpoint existente `/api/world/status` passa a expor `networkV1051` com janela corrente e acumulado desde a inicialização; não inclui dados individuais.
- **IMPORTANTE**: os bytes da telemetria são payloads pré-compressão. A franquia de banda do Render contabiliza rede efetiva (compressão, HTTP e overhead); não devem ser igualados.

## 2. Leitura visual de grupo com menu fechado

- O badge de grupo consultado pelo `updateOnlineWorld` passa de ~6 s para ~15 s quando o modal de grupo está fechado.
- Modal aberto continua com a cadência original de ~6 s. A abertura e ações explícitas fazem leitura forçada imediata.
- O cálculo de grupos e o crédito de recompensas no servidor NÃO foram alterados. Não houve cache novo em economia, ACL ou nas operações de escrita.

## 3. Proteções preservadas

- `game_saves`, `SAVE_NPC_STALE`, `SAVE_ORE_STALE`, revisões econômicas e reconciliação HOTFIX 3 inalterados.
- Leilões, loja, farm offline e pagamento NPC continuam com a mesma segurança.
- `consume_pvp_damage_events` mantém a política de HOTFIX 2 (PvE sem polling periódico; PvP inalterado).
- WebSocket: NPCs preservam o delta, 20 Hz de simulação e as cadências existentes. Nenhuma redução arbitrária de frequência de dano ou escudo.

## 4. Como testar

1. `npm run check && npm test` no projeto após aplicar o ZIP.
2. Gerar novo APK, testar login, navegação e Autopilot por 20–30 minutos.
3. No Render, buscar `STELLAR_NETWORK_V1051` em logs após 5 minutos de conexão. Verificar `topTypes` por bytes, especialmente `npc_batch`, `world_snapshot` e `world_player_patch`.
4. Abrir `/api/world/status`, conferir `networkV1051` (contadores agregados sem identificação pessoal).
5. Em Supabase, medir antes/depois a taxa de `get_my_battle_group_v179`, erros `SAVE_NPC_STALE` e `SAVE_ORE_STALE`.
6. Testar 2 jogadores (grupo e convite), multiplayer, PvP, relés, morte/respawn, troca de mapas, resgate do farm offline, compra/leilão, relog e conclusão de missões.
7. Para comparar banda Render de verdade, comparar janelas de 60 minutos com o MESMO número de jogadores, mapa, densidade de NPCs e qualidade do teste. A V105.1 é em grande parte um diagnóstico; não promete economia de banda em percentual.

## Reversão

Reverter somente os arquivos modificados no commit (ou aplicar o commit anterior). Nenhum banco de dados é alterado. Para desfazer a mudança no APK, recompilar a partir do commit antigo.

## Testes locais executados

202/202 testes Node aprovados. `npm run check`: 205 JS verificados, 309 assets validados. A execução real no Render/APK e a economia de banda dependem do deploy e teste de produção; nenhum deploy foi feito ao preparar este ZIP.
