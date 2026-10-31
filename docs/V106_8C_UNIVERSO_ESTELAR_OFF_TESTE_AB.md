# V106.8C — TESTE A/B · UNIVERSO ESTELAR V42 DESATIVADO

## Hipótese
O módulo visual da Expansão Unificada V42 (Forja, Guerra, Exploração, Civilização) pode estar relacionado à falha no login. Esta versão NÃO declara o problema resolvido. Isola somente esta função para confirmar ou descartar a hipótese.

## O que realmente foi desligado
- HTML: botão e modal Universo Estelar removidos.
- Carregamento: script `unified-expansion-v42.js` NÃO é importado na página.
- Menu MAIS: atalho Universo removido e navegação tolera a ausência dele.
- Servidor: o módulo `frontier-unified-v42.js` não é importado/montado; seus endpoints `/api/frontier/v42` respondem 503 controlado se chamados por clientes antigos.

## O que NÃO foi desligado
- `SharedUniverseClient`, WebSocket, NPCs, PvE/PvP, mapas X-1..X-8 e U-1..U-3.
- Autopilot, Farm Offline, hangar, CONF1/2, economia, missões, recompensas.
- Nenhum SQL, saldo, usuário, jogo salvo, recursos de arte ou dados do Supabase são alterados.
- Endpoints independentes de v421/v423/v426 permanecem registrados para reduzir o impacto. Sem o módulo V42, seus painéis relacionados ficam inacessíveis pela interface.

## Plano de teste A/B (Web primeiro)
1. Publique o ZIP pelo instalador universal **sobre V106.8B** (hotfix 106.9 ainda NÃO aplicado).
2. Abra a Web e localize no login: `TESTE V106.8C · UNIVERSO ESTELAR DESATIVADO`. Sem a marca, não vale o teste: tela antiga/cache/deploy ainda não atualizado.
3. Entre com a sessão usual. Faça teste em guia anônima caso a tela continue velha, sem apagar dados do APK.
4. Caso ABRA, salve e confira a nave, CONF1/2 e mapa; o módulo V42 é forte suspeito, mas ainda requer comparação de retorno para causalidade.
5. Caso NÃO ABRA, o erro provavelmente não depende do import/montagem do V42; conservar logs e investigar bootstrap e auth. Não insistir em novos deploys sem erro reproduzível.
6. Esse ZIP altera o site hospedado. **APK antigo continua contendo código local antigo** até uma nova compilação, então julgue primeiro o teste Web.

## Reversão
Basta restaurar os arquivos `public/index.html`, `public/modules/topbar-navigation-v481.js`, `server/index.js` da V106.8B publicada. O patch não remove os arquivos JS V42 nem banco e pode ser revertido sem migração.
