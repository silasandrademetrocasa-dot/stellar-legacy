# STELLAR LEGACY — Roadmap e inventário canônico V121.0

**Base auditada:** ZIP de 04/11/2026, projeto web/Android, release de pacote `47.7.60`. Documento de engenharia, não certificado de que todas as funcionalidades passaram em testes de produção.

## 1. Visão executiva

- Universo de combate espacial 2D/2.5D com cliente Web (GitHub Pages/Render), APK Android WebView e serviços Render + Supabase.
- Facções: Terra Alliance, Mars Dominion, Jupiter Federation.
- Núcleo em `public/game.js`, catálogo estático em `public/data.js`, APIs em `public/api.js`, servidor HTTP/WebSocket em `server/index.js`.
- Nomes oficiais rastreados: 43 naves; 40 itens e equipamentos; 34 NPCs ativos; 27 NPCs futuros; 14 mapas/portais estáticos; 7 recursos; 5 munições; 4 mísseis.

## 2. Menu e recursos existentes

| Área | Conteúdo / sistemas |
|---|---|
| Piloto | Hangar, Naves, Habilidades, AUX-9, designers, CONF 1/CONF 2 e equipamentos |
| Missões | Missões, Passe, Jornada, recompensas, Centro de Comando |
| Batalha | Arena, Warfront, Portais, eventos, grupos, mapas, NPCs e relés |
| Economia | Créditos, STL (campo legado `uridium`), loja, refinaria, leilão, recursos, craft, cupons e premium |
| Progressão | Nível, XP, missões, Passe de Temporada, conquistas, títulos e especializações |
| Multiplayer | Pilotos, grupos, clãs, PvP, relés, controle territorial, chat global/clã/PV |
| Apoio | Autopilot, Farm Offline, combate automático, reabastecimento, interface móvel, PWA/APK |
| Administração | Configurações de itens, NPCs, missões, eventos, Warfront, lojas, passe e telemetria |

## 3. Catálogo oficial

A lista completa de nomes originais está em [CATALOGO_OFICIAL_STELLAR_LEGACY_V121.md](CATALOGO_OFICIAL_STELLAR_LEGACY_V121.md). Alguns destaques:

- **Naves:** Aurora, Pioneer, Raptor, Meridian, Bastion, Concord, Vanguard, Sovereign, Lynx, Valkyrie, Leviathan, Striker, Seraph, Venatrix, Ravager, Praetor, Bulwark, Nexus Prime, Phantom, Wraith, Nullifier, Interdictor e demais variantes do catálogo.
- **Lasers:** ARC-1, ARC-P1, ARC-2, ARC-3, ARC-4, ARC-X, ARC-Ω.
- **Motores:** THR-1 a THR-7. **Escudos:** AEG e VSH.
- **Drones:** Halo e Nova. **AUX:** AUX-9 e protocolos de dano, HP, escudo, bônus de caixas e porão.
- **Recursos:** Ferron, Cryon, Virel, Ferrite, Duracite, Solarium e Voidite.
- **Inimigos:** Scavenger, Vrax, Zyron, Kharon, Dreadnox, Colossar, Ember Fang, Iron Wasp, Rift Mauler, Obsidian Pike e Apex Overlord; versões Prime e expansão astral.

## 4. Estado do save e problemas conhecidos em 04/11

- `game_saves` ainda é a referência online. V119 cria revisão, recibos, checkpoints e modo de observação, mas as RPCs legadas não foram todas convertidas.
- O snapshot V120 do banco tinha 6 contas de teste e uma divergência de hash que foi **reconciliada sem substituir o estado atual**; foi criado backup administrativo antes.
- A V120 continua sem corte homologado: recibos do gateway novo não comprovam cobertura das operações antigas; `enforce` deve continuar desligado.
- Sintomas relatados: save de configurações CONF, inventário/hangar, resgate Farm Offline, missões, compra/venda, latência, concorrência de duas contas e progressos perdidos na virada do dia.

## 5. Arquitetura proposta: LOCAL-FIRST

`UI/Jogo → Estado em memória → commit IndexedDB atômico (1 save + outbox + checkpoints A/B/C) → sincronização assíncrona (lotes ~5 segundos, com retry) → Render/Supabase (economia e estado compartilhado autoritativos)`

**Princípios obrigatórios:**

1. Um estado local por jogador/dispositivo, revisionado; nenhum outro subsistema substitui unilateralmente a versão atual.
2. Fila de operações com UUID de idempotência, estado pendente/confirmado, e compensações explícitas quando rejeitadas.
3. Snapshots A/B/C são **backups**; não concorrem com o save principal.
4. Operações locais (HUD, movimento, configuração sem compra) respondem instantaneamente; dados competitivos dependem da validação online.
5. Saldo confirmado e recibos de compra de Créditos/STL permanecem autoritativos no servidor; não enviar o save inteiro como prova de saldo.
6. Cada lote envia somente operações pendentes; checkpoints remotos completos são esparsos, assinados pelo servidor, nunca por uma chave secreta exposta no APK.
7. O cliente deve tolerar suspensão de timer no Android e reconciliar na retomada; jamais presumir que 5 segundos ocorreram no segundo plano.
8. Não liberar modo `enforce` antes de migrar RPCs concorrentes e validar a economia ponta a ponta.

## 6. Roadmap de entregas cumulativas

| Marco | Entrega | Critério de saída |
|---|---|---|
| V121.0-LAB (este pacote) | Núcleo IndexedDB opt-in, fila, checkpoints, catálogo e laboratório offline, correção pontual no Supabase | Sintaxe e testes de laboratório, sem alterar economia real |
| V121.1 | Migrar CONF1/2, hangar, munições e lojas para comandos locais com ACK transacional | Compra e troca reproduzíveis, sem perda/duplicação após reinício |
| V121.2 | Missões, NPCs, recursos e Farm/Autopilot com simulação local e concessão verificada | Virada do dia e 8h de Farm sem resgate duplicado |
| V121.3 | Sincronização por lotes no Render, outbox e gateway de comandos do Supabase | 2 dispositivos em conflito e reconexões adversas homologados |
| V121.4 | PvP, leilão, clãs, relés e Warfront autoritativos; reconciliador | Concorrência e economia testadas entre contas |
| V122.0 | Cutover de saves legados, limpeza definitiva e remoção do fallback | 100% das rotas convertidas, rollback e backup verificados |

## 7. Critérios mínimos de aprovação

- Save local: 100 operações encadeadas, reinício após cada ponto crítico, hash válido e revisões crescentes.
- Fila: repetir o mesmo UUID não concede itens/moedas duas vezes (a garantia tem de existir no servidor).
- Integridade: restaurar checkpoint A/B/C preserva um registro de recuperação e não pisa em estado remoto mais novo.
- Performance mobile: compras e trocas locais sem bloqueio de rede; medir mediana e P95 em aparelho fraco.
- Segurança: serviço remoto nunca aceita preço/saldo/cooldown de valor de confiança vindos do cliente.
- Rede: 1 segundo, 30 segundos e 8 horas desconectado, reconciliação após conflito, nenhuma perda de instruções pendentes.

## 8. Limpeza de repositório

Não apagar testes ativos, SQLs referenciados por regressões ou assets referenciados dinamicamente. Remover documentos históricos da raiz e arquivar histórico em um único ZIP; manter o instalador e a pasta `.github/workflows` protegidos.

## 9. Instalação e reversão

- Backup original: ZIP completo do usuário.
- Novo pacote: **incremental**, não substitui os 72 MB de artes.
- Para laboratório: abrir `/lab-v121.html` uma vez com internet; depois recursos ficam no cache do service worker (em origem/escopo compatível).
- Para modo piloto no jogo real: `/?localfirst=1`. O sistema legado permanece ativo enquanto o cutover não foi certificado.
- Reversão imediata do modo piloto: remover `?localfirst=1` ou desativar preferência local.
- Não executar `TRUNCATE` em produção com base só no inventário de 6 saves; mapear dependências e confirmar ADM antes de reinicializar mundo compartilhado.

## 10. Ponto de decisão

V121.0 é **infraestrutura e laboratório**, não a migração econômica completa. Subir a versão progressivamente, mantendo todos os escritores concorrentes em observação até convertê-los, evita repetir a regressão do save anterior.

---
Documento baseado em código e banco efetivamente inspecionados, não em nomes SQL herdados.
