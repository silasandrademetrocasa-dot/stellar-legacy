# Stellar Legacy V20.2.1 — Motor gráfico e cache (Etapa 2)

Base: **V20.2.0 Fundação**, ZIP completo. **Nenhum SQL adicional.**

## Mudanças

- `public/modules/asset-cache.js`: extraiu o gerenciador de carregamento de imagens para um módulo testável e sem dependência direta do DOM.
- Carregamento de sprites preserva `loading='eager'`, prioridade de nave/NPC e revisões das URLs atuais para não criar erro de sprites invisíveis.
- **Recuperação de falhas de download:** se uma imagem não carregar, não faz pedidos repetidos a cada frame; permite nova tentativa depois de 15 segundos.
- **Limpeza de fundos antigos:** uma imagem de cenário que não for utilizada por 90 segundos poderá ser liberada do cache interno. O cenário ativo recebe acessos frequentes na renderização e permanece carregado. Não altera arquivos de imagens.
- **Cache extra menos agressivo:** só elimina imagens extras quando estão acima do limite de qualidade e sem utilização recente por no mínimo 20 segundos. Mantém sprites de naves, NPCs, drones e AUX protegidos da limpeza automática.
- `public/game.js`: passou a consumir o módulo isolado. Desenho do canvas, combate, posição, HUD e carregamento de ativos permanecem com a mesma interface.
- `tests/asset-cache-v2021.test.mjs`: sete testes de URLs, carregamento, retry, descarte, prioridades, proteção de sprites.
- `scripts/verify-release.mjs`: verifica a existência do novo módulo durante o build.
- Versionamento: `20.2.1` no HTML, servidor e imports, evitando cache misto.

## Preservados

`public/api.js`, `public/data.js`, `public/combat-config-v2013.js`, `public/repair-balance.js`, `public/progression-plan-v2012.js`, `server/world.js`, `sql/CURRENT_BACKEND.sql` são idênticos ao pacote anterior, por SHA-256. Não modifica nenhuma tabela, save, combate, preços ou reconexão.

## Validação

Comando: `npm run verify` (executa checagem estática e regressões sem Supabase real). **PASSOU:** 127 testes (0 falhas), 32 arquivos JS conferidos e 216 referências de imagens verificadas. A suíte não consulta serviços externos.

## Limites

O cache JavaScript não é sinônimo de memória total do navegador: imagens usadas em elementos HTML, cache HTTP e memória do sistema gráfico são gerenciados pelo browser. A redução de memória depende do dispositivo e do modo de uso e **não foi medida num Android real**.

## Instalação

1. Primeiro instale e valide a V20.2.0.
2. Remova ZIPs anteriores na raiz do GitHub e envie apenas `stellar-legacy-V20.2.1-MOTOR-GRAFICO-CACHE.zip`, sem extrair.
3. Execute `Actions → Instalar versão do Stellar Legacy → Run workflow`.
4. Confirme `/health` versão `20.2.1` e smoke test de login, escudo CONF 1/2, nave/NPC/AUX, troca de mapa, perfil de qualidade e F5.
5. Não execute nenhum SQL antigo: não há migração nesta atualização.

Importante: o instalador faz commit na `main` antes do build do Render. Se a V20.2.0 apresentar algum bug funcional, **não instale esta V20.2.1** antes de corrigirmos a base.
