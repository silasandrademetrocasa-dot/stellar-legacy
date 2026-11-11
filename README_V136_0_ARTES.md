# Stellar Legacy — V136.0: Catálogo visual unificado (naves e NPCs)

Esta é uma atualização **somente visual** sobre o ZIP V135.0 fornecido. Sem SQL, sem alteração de itens, atributos, economia, recompensas ou saves.

## O que foi implementado

- O cliente agora usa `/assets/v136/` como única origem dos sprites de naves/NPCs. O `game.js`, `GAME_ASSETS`, o hangar (frente), o mapa (topo), o preloader, os NPCs dos mapas baixos e os Warbots compartilham caminhos V136.
- **43 naves** catalogadas: vistas card/frente (640 × 640 RGBA WebP), topo (640 × 640) e mapa (384 × 384), **12 redesenhadas a partir das pranchas individuais geradas** e 31 com sprites anteriores preservados, ampliados e refinados para não mudar identidades aprovadas.
- **NPCs:** 14 NPCs principais dos mapas baixos, incluindo variações Prime, mais tipos extras e boss. Os novos modelos de Scavenger, Scavenger Prime, Vrax e Vrax Prime foram recortados da arte individual. Outros NPCs usam arte existente tratada e mantêm suas silhuetas. As pranchas genéricas incorretas de Zyron, Kharon, Dreadnox e Colossar **não** foram instaladas.
- A Valkyrie continua com **o modelo visual branco/azul correto** do projeto; a proposta violeta reprovada não foi usada.
- O redesign **Meridian** foi aplicado. **Leviathan** preserva as asas curvas e o acabamento branco/ciano, como no print de referência.
- 317 imagens redundantes removidas das pastas antigas de naves/NPCs. Registro em `V136_ARQUIVOS_REMOVIDOS.txt`; script de limpeza para instalações incrementais: `npm run prune-art:v136`.
- Foram mantidos os diretórios de drone, AUX, cenários, eventos e equipamentos, além de atlases genéricos usados por outros sistemas. Não apagar esses arquivos sem auditoria de dependências.

## Limitações de qualidade

A maioria das pranchas enviadas eram imagens de apresentação. A extração removeu painéis, letras e fundo para produzir sprites transparentes. São **imagens escaladas para 640 px**, não texturas nativas 2048 px redesenhadas do zero. Confirme visualmente os recortes no celular antes de classificar como final/2K. Nenhum modelo genérico que mudou o NPC foi introduzido apenas para preencher a lista.

## Para instalar no repositório

1. Fazer backup do ZIP original.
2. Sobrepor o ZIP incremental V136 à raiz de `stellar-legacy-main/` (preservar a estrutura interna de pastas).
3. **Instalador Universal:** a V136.1 inclui `stellar-install.json` com 317 remoções explícitas, aplicadas automaticamente quando o ZIP é instalado. **Não é necessário rodar `npm run prune-art:v136`** nesse fluxo. Se fizer extração/sobreposição manual, execute `npm run prune-art:v136` antes dos testes. O pacote de atualização exige a base V135.
4. Rodar `npm run check` e os testes em ambiente com dependências instaladas (`npm install` seguido de `npm test`).
5. Publicar pelo GitHub/Render do projeto e, no Android, reiniciar a WebView para carregar as URLs V136. O pacote aqui entregue **não equivale a deploy remoto**.

## Checklist de aceite no dispositivo

- Hangar: Aurora, Pioneer, Raptor, Meridian, Lynx, Pathfinder, Kensei, Seraph, Phantom, Bastion, Bulwark, Leviathan; cada imagem corresponde ao nome exibido.
- Mapa: os mesmos cascos (top view), sem barras/títulos nas imagens e sem sprites faltando.
- NPCs: Scavenger/Prime, Vrax/Prime e os tipos adicionais renderizam com cor e escala esperada.
- Troca de mapa e mudança CONF1/CONF2 não resetam nave, equipamentos ou visual.
- Natal e designers ativos ainda respeitam as preferências do jogador; as imagens específicas dos eventos não foram modificadas.

## Validação

`node scripts/verify-release.mjs` valida caminhos, versões, JS e HTML; `node scripts/audit-module-graph.mjs` valida imports. Testes V136 verificam catálogo, strings de rotas e ausência dos 317 arquivos antigos.

A suíte `tests/v134-transactions.test.mjs` requer `@electric-sql/pglite`; sem essa dependência não é possível executar esse grupo. Isso não valida o jogo no Render nem no APK real.
