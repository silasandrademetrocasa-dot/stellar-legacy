# Stellar Legacy V20.2.5 — Motor Canvas / Smartphone

## Objetivo
Atacar partes repetitivas do desenho Canvas 2D na qualidade BAIXA. O usuário mediu cerca de 12 FPS inicialmente e relatou 14 FPS na versão anterior à V20.2.4 (observação informal). Não atribuímos esse resultado a uma causa sem dados adicionais.

## Comparação com V20.2.4
1. `public/modules/backdrop-raster-cache.js` novo: rasterização antecipada de fundos 1600×900 em 1024×576 somente no perfil BAIXA; cache LRU para até 2 fundos, fallback para original em falha.
2. `public/modules/text-width-cache.js` novo: guarda 128 larguras de nome do piloto com chave de fonte + nome; não altera cores ou fontes.
3. `public/game.js`: usa cache no background apenas, mantém originais para sprites; minimapa não redesenha se recolhido, oculto ou desativado, mas redesenha ao abrir; bordas e bases fora da câmera não geram desenho; resize no-op se dimensões idênticas.
4. `public/index.html`, `package.json`, `server/index.js`: revisão de versionamento do frontend e `/health`.
5. `tests/canvas-backdrop-v2025.test.mjs`: testes de limite, proporção, fallback, cache, integração e preservação de simulação.

## Fora de escopo
Sem mudança intencional nos números do combate, escudo de CONF 1/2, estado da nave, reparação, saves, bancos/SQL, economia, PvP, eventos, clãs ou sprites de naves/NPCs/AUX. Não foram realizadas alterações no GitHub/Render/Supabase da conta do usuário. Não foram executados testes reais em Android nesta entrega.

## Validação local
- `npm run verify`: **155/155 testes aprovados**; **42 arquivos JavaScript** com sintaxe válida; **216 caminhos de assets** verificados.
- Comparação SHA de todo o pacote com V20.2.4: módulos críticos/SQL/sprites preservados byte a byte.
- Testes do background verificam cache 1600×900→1024×576, redução uma vez por imagem, LRU máximo 2, fallback quando o Canvas falha e dimensões verticais.
- Testes do texto cobrem mesma fonte/nome, alteração de fonte/nome e descarte LRU.
- **A validação automatizada não mede FPS nem substitui teste real no navegador.**

## Roteiro de teste prático
1. Mesmo celular, qualidade BAIXA, mesmo mapa, câmera/movimento similar, 2–3 minutos com o diagnóstico ligado.
2. Comparar FPS, P95 do quadro e tempo P95 de atualização/desenho com V20.2.4.
3. Abrir/fechar o minimapa; checar reabertura, base, portais e limites do mapa.
4. Trocar mapas várias vezes, confirmar todos os cenários e imagens de nave/NPC/AUX sem recortes ou sumiços.
5. Combate com NPCs e jogadores: verificar disparo, HP/escudos, CONF 1/2 com cooldown e persistência de dano, inclusive após F5.
6. Se FPS não melhorar, analisar o relatório do diagnóstico para distinguir GPU/Canvas de CPU/simulação.

## Instalação
ZIP completo na raiz do GitHub, sem extrair, somente um `stellar-legacy*.zip`; GitHub Actions → **Instalar versão do Stellar Legacy** → **Run workflow**. No Render confirme `/health` igual a `20.2.5`. Nenhum SQL para rodar.
