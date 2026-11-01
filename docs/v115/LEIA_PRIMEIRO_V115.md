# STELLAR LEGACY V115.0 — GERRA GALÁCTICA & PERFORMANCE

> Pacote cumulativo das fases de estabilização V114.0, V114.1, V114.2, V114.3 e V115.0. Aplica-se **somente sobre a V113.1** pelo Instalador Universal. Não é o jogo completo.

## Cinco entregas independentes

1. **V114.0 PvP**: checagem precoce de alvo, mapa, grupo, vitalidade, presença e alcance, preservando as RPCs oficiais de dano.
2. **V114.1 Clãs/relés**: evita captura fora do círculo e tiro aliado; mantém defesa, domínio e módulos sob autoridade do banco.
3. **V114.2 Eventos**: limpeza pontual por `eventId`, NPCs/minérios órfãos, sem snapshots gigantes, com proteção contra limpeza cruzada.
4. **V114.3 Arena**: replay visual limitado, resultado e saldo reais sempre retirados da RPC íntegra.
5. **V115.0 Performance**: backpressure de movimento, restauração automática de posições e monitor ADM sem dados pessoais.

## Compatibilidade

Não modifica as tabelas ou funções SQL, regras de reward, inventário, preços, Farm Offline, Autopilot V112, forja AUX V113.1, respawn de NPC comum, autenticação, RPC de Arena ou economia. **Não é necessária migração SQL.**

## Limites da validação

O teste automatizado passa pelo grafo de imports, scripts de release, módulos de V114/V115 e suíte completa. Isso é validação de código, **não confirmação de desempenho, PvP ou rede reais após o deploy**. Não foi realizado deploy, nem partidas de jogadores em produção. O sistema competitivo já existia; esta versão reforça estabilidade e integração, não afirma reescrever o motor PvP/Clãs do zero.

## Homologação em produção (pós-deploy)

- [ ] PvP B4-1: dois pilotos, ataques, mísseis, escudos, logout e reentrada.
- [ ] Relé: clã A defende e clã B contesta; sem fogo amigo da própria torre.
- [ ] Evento: presença simultânea, término da janela, limpeza do minimapa e sem respawn fantasma.
- [ ] Arena: batalha curta, batalha longa, pular animação, contador e recompensa oficiais.
- [ ] Rede: Wi-Fi/4G com throttling; confirmar resync de piloto após congestionamento.
- [ ] Farm Offline e Autopilot ligados separadamente sem regressões.
- [ ] ADM: endpoint de métricas responde somente para contas administrativas.

## Instalar

1. Na raiz do GitHub, remova qualquer ZIP incremental antigo.
2. Envie `STELLAR_LEGACY_V115_0_MULTIPLAYER_EVENTOS_PERFORMANCE_CUMULATIVA.zip`.
3. GitHub Actions -> Instalador Universal -> rodar e conferir CI.
4. Render deve executar `npm run verify` no build.
5. Após o deploy, feche e reabra o atalho/PWA para atualizar `game.js`.
6. Faça os testes em duas contas antes de liberar evento competitivo longo.

Não realize upload de arquivos do ZIP diretamente no painel Supabase. Todos os novos módulos são apenas código do jogo.
