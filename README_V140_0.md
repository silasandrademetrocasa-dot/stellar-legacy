# Stellar Legacy V140.0 — bases natalinas e totens

Atualização incremental sobre **V139 / 47.7.71**. Resultado: **47.7.72**.

## Bases das facções

Integra os modelos aprovados em perspectiva 3D como sprites 2D estáticos e transparentes:

- Terra: prata, gelo azul e energia ciano.
- Marte: fortaleza de metal escuro com energia vermelho-laranja.
- Júpiter: torre curva, observatórios, detalhes dourados e energia violeta.

As bases aparecem em **1-1, 2-1, 3-1, 1-8, 2-8 e 3-8**, seguindo a facção territorial do setor. A posição física da base e a zona segura de raio 520 permanecem as atuais. A arte natalina acompanha a janela de Natal já definida no jogo; fora dela, a base anterior é o fallback.

## Totens funcionais

Tocar em um emblema distante define a aproximação da nave. Ao chegar, aparece um botão para abrir o serviço. Tocar no emblema já dentro do alcance abre o painel diretamente.

| Totem | Painel existente |
|---|---|
| Missões | Missões e progresso |
| Comércio | Porão, cotação e venda com confirmação |
| Hangar | Equipamentos, nave, drones e AUX |
| Portais | Materializador e painel dos Portais Astrais |

Os totens ficam dentro da zona segura e só interagem na base da própria facção. Trocar de mapa/conta, dar outro comando de movimento, entrar no Farm offline ou ficar destruído cancela a interação pendente. A aproximação não abre um painel automaticamente ao chegar.

**Portais em X-8:** o totem abre o painel existente. Montagem e entrada continuam restritas à base X-1 pelas regras atuais. Esta versão não amplia essas permissões nem altera custos ou recompensas.

## Desempenho

Cada base usa uma imagem WebP estática de 1024×576, já com neve, gelo, conexões e emblemas. Não usa modelo 3D, sequência de frames ou sistema de partículas de neve. O destaque e o nome do totem aparecem somente durante a seleção.

As três texturas juntas correspondem a aproximadamente 6,75 MiB RGBA decodificados; a navegação ociosa não faz consultas de contexto, rede ou salvamento. As ações reutilizam os mesmos painéis e comandos já existentes. As permissões SQL corrigidas na V139 continuam em vigor.

## Instalação e validação

Envie o ZIP V140 à raiz e execute o workflow universal sobre a V139 completa (47.7.71). O instalador e `.github` permanecem os atuais. **Não é necessário SQL novo.** A publicação depende do workflow e do deploy no Render.

Os testes cobrem as três facções, X-1/X-8, alcance, aproximação, cancelamento de interação obsoleta, base inimiga, ação única e orçamento das texturas. A verificação de release/grafo confere sintaxe, versões e arquivos. O teste manual pós-deploy no Android continua necessário para confirmar enquadramento, toque e desempenho real.

A tentativa de abrir o servidor local pelo navegador remoto foi recusada (`ERR_CONNECTION_REFUSED`); não foi realizada uma sessão autenticada de navegador. A revisão visual dos sprites e os testes locais de navegação/renderização foram feitos separadamente.

A revisão das demais artes está em `docs/v140/REVISAO_ARTES.md`.
