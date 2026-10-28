# V104 — Otimização cumulativa de rede e consultas (47.7.60)

**Escopo:** upgrade cumulativo sobre 47.7.59, preservando regras, cadastros, inventário, economia, autenticação, integridade do save e migrações anteriores. **Não requer SQL novo nem mudança de schema.** Arquivos modificados na própria distribuição.

## O que mudou

| Área | Antes (47.7.59) | Depois (47.7.60) | Segurança funcional |
| --- | --- | --- | --- |
| WebSocket — pilotos | `world_player_patch` carregava sempre todo o estado público | Delta por campo; omite frames iguais; cliente remonta o estado anterior antes da interpolação | `false`, `null`, vida, escudo, alvos e PET são mantidos; entrada/spawn seguem completos |
| WebSocket — pilotos ociosos | Ping do movimento/estado do cliente a cada 1,5 s | A cada 3 s quando sem movimento/combate; atualização ativa preservada | Sem mudar a janela de combate nem a validação de deslocamento no servidor |
| NPCs distantes | Correção de movimento de NPCs distantes a cada 2,5 s | Até 5 s distante, com limiar de alteração; perto continua mais frequente (até 8 Hz) | HP, escudo e fase de boss sempre no delta; `npc_patch`, morte e spawn são enviados sem novo atraso |
| WebSocket sob congestionamento | Backpressure anterior descarta apenas lote de movimento | Mesmo mecanismo com baseline confirmado após envio bem-sucedido | Eventos críticos não são descartados nem ocultados por baseline adiantado |
| Autopilot | Avisos de rotina atualizavam interface continuamente | Avisos de rotina são agrupados em janela de 1 s; avisos críticos imediatos | Autorização, parada, dano e compras continuam com as regras anteriores; não altera push do sistema operacional |
| Chat global/clã | Histórico consultado a cada ~1,1 s | Histórico consultado a cada ~3 s | Envio de mensagens continua imediato; novas mensagens podem aparecer até ~3 s depois |
| Presença online — leitura SQL | `get_map_presence_v12` a cada ciclo de presença (~4,5 s em WS online) | A cada ~14 s quando WebSocket está ativo; fallback imediato quando indisponível | `upsert` de presença continua a cada ~4,5 s para cumprir o TTL de ~9 s no banco |
| Inbox de dano PvP | Polling a cada 450 ms | **450 ms dentro de PvP mantidos**; fora de PvP até 15 s; consulta imediata ao entrar/sair | A latência de dano em combate PvP não é degradada |
| Snapshots SQL no servidor | Refresh periódico de topbar, NPC, mundo e lojas a cada 15 s | Cache/refresh padrão a cada 30 s; leituras concorrentes idênticas compartilham uma chamada | Atualizações explícitas de ADM (`force=true`) continuam imediatamente disponíveis |
| API no navegador | GET e alguns RPCs de configuração iguais podiam competir em paralelo | Requisições de leitura simultâneas e idênticas fazem uma única ida à rede | Não faz cache de resultados; chaves incluem sessão, método, corpo e cabeçalhos; **não agrega mutações** |

**Nota:** O JSON inicial de mundo/entrada continua completo. Isso é necessário para clientes recém-conectados. Não removemos campos essenciais de respostas de menu ou de endpoints administrativos; mudanças de contrato sem inventário dos consumidores poderiam quebrar o jogo.

## Auditoria de SQL/Render — priorização

1. **Reduzido no código:** leituras repetidas do histórico do chat (RPC), listagem de presença de pilotos (RPC), polls do inbox de dano fora de arenas (RPC) e recargas de quatro snapshots de configuração via Render→Supabase. Requisições iguais em voo agora são compartilhadas.
2. **Mantido propositalmente:** `upsertPlayerPresenceOnline` porque o registro expira em ~9 s; SQL do combate PvP enquanto em arena; `requireUser`, sessão única, banimento, RLS/ACL, validações de preços, compras, inventário, save oficial, progresso e notificações de pagamento.
3. **Não removido sem teste de contrato:** outras consultas de menus/admin, pesquisas de clã/mercado e leitura de snapshot inicial. Podem parecer redundantes em análise estática, mas cada tela/ação pode depender de colunas específicas ou exigir dados atualizados imediatamente.
4. **Compressão HTTP:** já estava disponível no servidor. A V104 não a duplicou e não introduziu cache persistente de dados privados.

## Como medir no próximo teste real

Faça **o mesmo roteiro na 47.7.59 e na 47.7.60**, mantendo mesma região Render/Supabase, qualidade gráfica, mapa e quantidade de jogadores. Recomendação: sessões de **10 minutos** com 1, 5 e 20 clientes, uma sessão ociosa, uma com farm/autopilot, uma com combate contra NPC próximo e uma com PvP.

**Colete antes/depois:**

- `GET https://SEU-RENDER/api/world/status` no início e no fim. O campo `networkV104` existe **somente na V104**. Contadores reiniciam ao reiniciar o processo ou publicar um deploy.
- Painel Render: CPU, memória, banda de saída, número de requisições HTTP e erros/restarts. Agrupe por mesma janela de tempo e concorrência.
- Supabase: quantidade e duração das RPCs `get_chat_history...`/presença (`get_map_presence_v12`), `consume_pvp_damage...`, `get_game_runtime_public_v1813`, `get_npc_runtime_config_v1811`, `get_world_runtime_config_v1814`, `get_shops_runtime_config_v1817c`. Compare pelo identificador real da RPC na sua instância.
- Celular: FPS p50/p95, travamentos, consumo de dados, percepção de latência, NPC próximo/destino, recebimento de vida/escudo, troca de mapa, logout e reconexão.
- Em PvP: teste matar, morrer, perder escudo, sair e reentrar no mapa, com dois celulares simultâneos. Em menus: abrir/fechar rapidamente chat, loja, clan, inventário e ADM.

### Contadores `networkV104`

| Campo | Interpretação |
| --- | --- |
| `since` | Instante de início dos contadores (epoch ms) |
| `broadcastMessages`, `broadcastBytes` | Mensagens/bytes de `Room.broadcast` contados **por destinatário** |
| `playerPatchMessages`, `playerPatchBytes` | Subconjunto de broadcasts do estado dos pilotos |
| `playerFullEquivalentBytes` | Tamanho estimado do envio integral dos mesmos frames de piloto (comparativo interno) |
| `playerUnchangedSkipped` | Frames iguais suprimidos, ponderados pelos destinatários |
| `npcBatches`, `npcBatchBytes` | Lotes de movimento NPC enviados via `sendNpcBatches` |
| `npcBackpressureSkips` | Ciclos de lote pulados por buffer de WebSocket cheio |

**Limites do contador:** não inclui todo tráfego WebSocket/HTTP, snapshots diretos de entrada e dados Supabase. Não o interprete como consumo total de banda. A V103 não dispõe desses contadores, portanto use também o painel Render e as ferramentas de rede do cliente na comparação.

### Benchmark local (só JSON sintético)

```bash
npm run verify
npm run benchmark:v104
```

Os dados sintéticos de 30 segundos compararam payload bruto, sem compressão e sem concorrência: **pilotos ~59,8% menos bytes**, **NPC distante ~46% menos bytes** no cenário artificial. Esses percentuais **não** são ganho medido de CPU, FPS, ping ou custo de SQL em produção.

## Critérios de aceite para publicar

- 184 testes automatizados passam e validação de assets/sintaxe aprovada.
- Dano PvP não demora mais do que a versão anterior na mesma condição; nenhum evento de dano é reaplicado ao sair da arena.
- NPC próximo continua visível e recebe vida, escudo, morte e drops corretamente; NPC distante pode atualizar o minimapa em cadência menor.
- A loja e o save não duplicam operações; permissões ADM e bloqueio de Offline Farm continuam efetivos.
- Comparação de banda SQL/Render mostra redução **real** em igual cenário, sem aumento relevante de p95 de latência nem queda de FPS.

Se houver regressão, restaure a **47.7.59** (ZIP original) e retorne com os logs/valores antes e depois. A V104 não inclui rollback de banco porque não altera o schema.
