# Stellar Legacy V56.0 — Hangar Galáctico / Base Restaurada

Atualização incremental SOBRE A V55.0 instalada (versão 47.7.10). 

## Mudanças
- Base original do jogo restaurada nos mapas X-1 e X-8 por facção, usando arquivos V22.12 que já estavam no projeto. Elimina renderização alternativa da base V53 (mantém relés e outros modelos 3D).
- Novo CSS para Hangar (Naves/Equipamentos), inventário, Loja e menus do próprio Hangar; visual tecnológico NEON responsivo.
- Equipamentos organizados por NAVE / DRONES / AUX-9 em uma única tela e configuração CONF 1/2 compartilhada. O inventário, slots originais, preços e ações existentes permanecem.
- Configuração global agora inclui lasers, escudos e modo do AUX-9, além dos equipamentos de nave e drones. Cooldown 5s; escudos salvos individualmente; não cria itens.
- 13 renders em perspectiva gerados a partir dos modelos GLB que já estão no jogo para a seleção de nave, Hangar e Loja.
- Retirada da segunda fileira redundante de atributos em Equipamentos; a nave mantém 6 cartões de atributos no topo.
- Assets, menus de AUX, protocolos, módulos e recursos continuam originais. Não altera compras, atributos de combate ou banco.

## Limites conhecidos
- As imagens em perspectiva usam geometria otimizada dos GLBs, não o acabamento ilustrado 1:1 das artes conceituais; animações 3D interativas do Hangar ficam para etapa futura.
- Verificação local estrutural/automática; conferir clique, rolagem e desempenho no Android após deploy.

## Instalação
1. GitHub main já deve estar na V55.0.
2. Remova quaisquer ZIPs antigos da raiz e envie apenas este ZIP.
3. Execute Actions > Instalador Universal > instalar.
4. Depois do Render atualizar, recarregue o jogo no celular e abra Hangar / Equipamentos / Loja.
5. Teste CONF 1/2 com nave/drones/AUX e volte à base X-1 para equipar/retirar normalmente.

Não requer SQL novo. Arquivos da raiz e funções legadas não são removidos.
