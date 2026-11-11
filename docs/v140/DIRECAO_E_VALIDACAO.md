# Bases V140 — direção e integração

## Direção final aprovada

Perspectiva de modelo 3D, semelhante à base orbital existente, com uma torre estelar funcional, plataformas em alturas diferentes e sugestão discreta de silhueta natalina pelas estruturas e pelo gelo. Quatro totens simples conectados por braços estreitos: Missões, Comércio, Hangar e Portais. Terra ciano/prata; Marte vermelho-laranja/metal escuro; Júpiter violeta/prata/dourado.

A direção anterior de base plana em formato literal de árvore foi substituída após o feedback do usuário. A vista superior das naves e drones continua preservada; a perspectiva é específica das bases.

## Preparação das imagens

As três pranchas aprovadas foram convertidas pela geração de imagem em recortes com alfa transparente, preservando os modelos, a perspectiva e os emblemas. Os pedidos removeram fundo, títulos, rótulos externos e partículas soltas, mantendo somente a arquitetura, os totens e as conexões.

As saídas nativas têm aproximadamente 1671×941 pixels (Marte 1672×941). Para o mapa, foram exportadas em 1024×576 WebP, mantendo o alfa. Não há alegação de geração nativa de 2K. Hashes e tamanhos estão no manifesto de `public/assets/v140/bases`.

## Navegação e guarda das ações

O registro central calcula as áreas clicáveis e os destinos a partir do mesmo layout utilizado no desenho. As coordenadas da Terra têm ajuste próprio para os emblemas da sua arte. A elegibilidade é verificada novamente ao interagir: mapa com base, território próprio, sessão local em jogo, nave operante e interface livre.

A aproximação é local e usa o movimento normal. Não concede moeda, não compra itens, não entra em portais e não grava snapshots por conta própria. O clique de interação abre um painel existente; qualquer operação subsequente mantém o caminho de validação e recibo daquele setor.

Os testes verificam os seis pares facção/mapa, ação única, cancelamento por novo destino ou contexto, bloqueio em base inimiga e ausência de consultas em estado ocioso. As imagens são verificadas por hash, dimensões e orçamento de memória.
